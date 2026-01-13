import * as readline from 'readline';
import chalk from 'chalk';
import { config } from 'dotenv';
import { createProvider } from './llm/index.js';
import { Agent } from './agent.js';

// Load environment variables
config();

function getConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey) {
    console.error(chalk.red('Error: OPENROUTER_API_KEY environment variable is required'));
    console.error(chalk.dim('Get your key at: https://openrouter.ai/keys'));
    process.exit(1);
  }

  const model = process.env.MODEL || 'anthropic/claude-sonnet-4';

  return { model, apiKey };
}

async function main() {
  const { model, apiKey } = getConfig();

  console.log(chalk.bold.blue('\n  CLI Coding Agent'));
  console.log(chalk.dim(`  Provider: OpenRouter | Model: ${model}`));
  console.log(chalk.dim(`  Working directory: ${process.cwd()}`));
  console.log(chalk.dim('  Type "exit" to quit, "clear" to clear history\n'));

  const llmProvider = createProvider({ apiKey, model });
  const agent = new Agent(llmProvider);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question(chalk.green('> '), async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed.toLowerCase() === 'exit') {
        console.log(chalk.yellow('\nGoodbye!'));
        rl.close();
        process.exit(0);
      }

      if (trimmed.toLowerCase() === 'clear') {
        agent.clearHistory();
        prompt();
        return;
      }

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
