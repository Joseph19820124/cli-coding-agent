import chalk from 'chalk';
import type { LLMProvider, ContentBlock, ToolCall } from './llm/index.js';
import { Conversation } from './conversation.js';
import { getAllTools, executeTool } from './tools/index.js';
import {
  assessToolRisk,
  askConfirmation,
  formatRiskLevel,
  type SecurityConfig,
  defaultSecurityConfig,
} from './security.js';

const SYSTEM_PROMPT = `You are a helpful coding assistant running in a CLI environment. You have access to tools that allow you to:
- Read and write files
- Edit files by replacing specific strings
- Execute bash commands
- Search for files using glob patterns
- Search file contents using grep

When the user asks you to do something:
1. Think about what tools you need to use
2. Use the tools to accomplish the task
3. Report the results back to the user

Be concise in your responses. When showing code, use markdown code blocks.
Always verify your work by reading files after editing them if needed.

IMPORTANT: The user must approve tool executions. If a tool is denied, explain what you were trying to do and ask if they want to proceed differently.`;

export class Agent {
  private provider: LLMProvider;
  private conversation: Conversation;
  private securityConfig: SecurityConfig;

  constructor(provider: LLMProvider, securityConfig?: Partial<SecurityConfig>) {
    this.provider = provider;
    this.conversation = new Conversation();
    this.securityConfig = { ...defaultSecurityConfig, ...securityConfig };
  }

  async processMessage(userMessage: string): Promise<void> {
    this.conversation.addUserMessage(userMessage);
    await this.runAgentLoop();
  }

  private async runAgentLoop(): Promise<void> {
    const tools = getAllTools();
    let continueLoop = true;

    while (continueLoop) {
      const assistantContent: ContentBlock[] = [];
      const toolCalls: ToolCall[] = [];

      // Call LLM
      const stream = this.provider.chat(
        this.conversation.getMessages(),
        tools,
        SYSTEM_PROMPT
      );

      // Process stream
      for await (const event of stream) {
        if (event.type === 'text') {
          process.stdout.write(event.text);
          // Accumulate text
          const lastBlock = assistantContent[assistantContent.length - 1];
          if (lastBlock && lastBlock.type === 'text') {
            lastBlock.text += event.text;
          } else {
            assistantContent.push({ type: 'text', text: event.text });
          }
        } else if (event.type === 'tool_call') {
          toolCalls.push(event.toolCall);
          assistantContent.push({
            type: 'tool_use',
            id: event.toolCall.id,
            name: event.toolCall.name,
            input: event.toolCall.arguments,
          });
        } else if (event.type === 'done') {
          // Check if we should continue
          continueLoop = event.stopReason === 'tool_use';
        }
      }

      // Add newline after text output
      const hasText = assistantContent.some(b => b.type === 'text');
      if (hasText) {
        console.log();
      }

      // Save assistant message
      if (assistantContent.length > 0) {
        this.conversation.addAssistantMessage(assistantContent);
      }

      // Execute tool calls with security checks
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          const result = await this.executeToolWithSecurity(toolCall);
          this.conversation.addToolResult(toolCall.id, result.output, result.denied);
        }
        console.log();
      }
    }
  }

  private async executeToolWithSecurity(
    toolCall: ToolCall
  ): Promise<{ output: string; denied: boolean }> {
    const { name, arguments: args } = toolCall;

    // Assess risk
    const check = assessToolRisk(name, args);

    // Determine if we need confirmation
    let needsConfirmation = check.requiresConfirmation;

    // Apply config overrides
    if (check.riskLevel === 'safe' && this.securityConfig.autoApproveSafe) {
      needsConfirmation = false;
    }
    if (check.riskLevel === 'low' && this.securityConfig.autoApproveLow) {
      needsConfirmation = false;
    }
    if (name === 'read' && this.securityConfig.autoApproveRead) {
      needsConfirmation = false;
    }

    // Show tool info
    console.log('');
    console.log(chalk.cyan(`[Tool: ${name}]`) + ' ' + formatRiskLevel(check.riskLevel));

    // Ask for confirmation if needed
    if (needsConfirmation) {
      const approved = await askConfirmation(name, args, check);
      if (!approved) {
        const deniedMsg = `Tool execution denied by user: ${name}`;
        console.log(chalk.red(deniedMsg));
        return { output: deniedMsg, denied: true };
      }
    } else {
      // Show args for auto-approved tools
      console.log(chalk.dim(JSON.stringify(args, null, 2)));
    }

    // Execute the tool
    try {
      const result = await executeTool(name, args);

      // Display result (truncated)
      const displayResult = result.length > 500
        ? result.substring(0, 500) + '\n... (truncated)'
        : result;
      console.log(chalk.dim(displayResult));

      return { output: result, denied: false };
    } catch (error) {
      const errorMsg = `Error: ${error instanceof Error ? error.message : error}`;
      console.log(chalk.red(errorMsg));
      return { output: errorMsg, denied: false };
    }
  }

  clearHistory(): void {
    this.conversation.clear();
    console.log(chalk.yellow('Conversation history cleared.'));
  }

  // Update security config at runtime
  setSecurityConfig(config: Partial<SecurityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...config };
  }
}
