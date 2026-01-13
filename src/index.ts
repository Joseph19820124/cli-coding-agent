import * as readline from 'readline';
import chalk from 'chalk';
import { config } from 'dotenv';
import { createProvider } from './llm/index.js';
import { Agent } from './agent.js';
import { executeCommand, type CommandContext } from './commands.js';
import { loadConfig, ensureStorageDir } from './storage.js';
import type { SecurityConfig } from './security.js';

// Load environment variables
config();

async function getConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey) {
    console.error(chalk.red('Error: OPENROUTER_API_KEY environment variable is required'));
    console.error(chalk.dim('Get your key at: https://openrouter.ai/keys'));
    process.exit(1);
  }

  // Load user config
  const userConfig = await loadConfig();

  const model = process.env.MODEL || userConfig.defaultModel || 'anthropic/claude-sonnet-4';

  // Security config from environment or user config
  const securityConfig: Partial<SecurityConfig> = {
    autoApproveSafe: process.env.AUTO_APPROVE_SAFE !== 'false' && (userConfig.autoApproveSafe ?? true),
    autoApproveLow: process.env.AUTO_APPROVE_LOW === 'true' || (userConfig.autoApproveLow ?? false),
    autoApproveRead: process.env.AUTO_APPROVE_READ === 'true' || (userConfig.autoApproveRead ?? false),
  };

  return { model, apiKey, securityConfig };
}

async function main() {
  await ensureStorageDir();
  const { model, apiKey, securityConfig } = await getConfig();

  console.log(chalk.bold.blue('\n  CLI Coding Agent'));
  console.log(chalk.dim(`  Provider: OpenRouter | Model: ${model}`));
  console.log(chalk.dim(`  Working directory: ${process.cwd()}`));
  console.log(chalk.green('  Security: ') + chalk.dim('Permission prompts enabled'));
  console.log(chalk.dim('  Type /help for commands, or just start chatting'));
  console.log('');

  const llmProvider = createProvider({ apiKey, model });
  const agent = new Agent(llmProvider, securityConfig);

  let currentSessionId: string | null = null;
  let shouldExit = false;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Command context
  const ctx: CommandContext = {
    agent,
    currentSessionId,
    setSessionId: (id: string | null) => {
      currentSessionId = id;
    },
    exit: () => {
      shouldExit = true;
      rl.close();
      process.exit(0);
    },
  };

  const prompt = () => {
    // Update context with current session id
    ctx.currentSessionId = currentSessionId;

    const promptStr = currentSessionId
      ? chalk.green(`[${currentSessionId.slice(0, 8)}] > `)
      : chalk.green('> ');

    rl.question(promptStr, async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      // Handle commands (starting with /)
      if (trimmed.startsWith('/')) {
        const result = await executeCommand(trimmed, ctx);
        if (result.handled) {
          if (!shouldExit) {
            prompt();
          }
          return;
        }
      }

      // Handle legacy commands (without /)
      const lowerInput = trimmed.toLowerCase();
      if (['exit', 'quit'].includes(lowerInput)) {
        console.log(chalk.yellow('\nGoodbye!'));
        rl.close();
        process.exit(0);
      }

      if (lowerInput === 'help') {
        await executeCommand('/help', ctx);
        prompt();
        return;
      }

      if (lowerInput === 'clear') {
        await executeCommand('/clear', ctx);
        prompt();
        return;
      }

      if (lowerInput === 'tools') {
        await executeCommand('/tools', ctx);
        prompt();
        return;
      }

      if (lowerInput === 'trust') {
        await executeCommand('/trust', ctx);
        prompt();
        return;
      }

      if (lowerInput === 'untrust') {
        await executeCommand('/untrust', ctx);
        prompt();
        return;
      }

      // Process as chat message
      try {
        await agent.processMessage(trimmed);
      } catch (error) {
        console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      }

      prompt();
    });
  };

  prompt();
}

main().catch((error) => {
  console.error(chalk.red(`Fatal error: ${error.message}`));
  process.exit(1);
});
