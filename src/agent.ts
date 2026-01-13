import chalk from 'chalk';
import type { LLMProvider, ContentBlock, ToolCall } from './llm/index.js';
import { Conversation } from './conversation.js';
import { getAllTools, executeTool } from './tools/index.js';

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
Always verify your work by reading files after editing them if needed.`;

export class Agent {
  private provider: LLMProvider;
  private conversation: Conversation;

  constructor(provider: LLMProvider) {
    this.provider = provider;
    this.conversation = new Conversation();
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

      // Execute tool calls
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          console.log(chalk.cyan(`\n[Tool: ${toolCall.name}]`));
          console.log(chalk.dim(JSON.stringify(toolCall.arguments, null, 2)));

          const result = await executeTool(toolCall.name, toolCall.arguments);

          // Display result (truncated)
          const displayResult = result.length > 500
            ? result.substring(0, 500) + '\n... (truncated)'
            : result;
          console.log(chalk.dim(displayResult));

          // Add tool result to conversation
          this.conversation.addToolResult(toolCall.id, result);
        }
        console.log();
      }
    }
  }

  clearHistory(): void {
    this.conversation.clear();
    console.log(chalk.yellow('Conversation history cleared.'));
  }
}
