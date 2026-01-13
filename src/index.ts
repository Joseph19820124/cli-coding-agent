import * as readline from 'readline';
import chalk from 'chalk';
import { config } from 'dotenv';
import { createProvider } from './llm/index.js';
import { Agent } from './agent.js';
import type { SecurityConfig } from './security.js';

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

  // Security config from environment
  const securityConfig: Partial<SecurityConfig> = {
    autoApproveSafe: process.env.AUTO_APPROVE_SAFE !== 'false',
    autoApproveLow: process.env.AUTO_APPROVE_LOW === 'true',
    autoApproveRead: process.env.AUTO_APPROVE_READ === 'true',
  };

  return { model, apiKey, securityConfig };
}

async function main() {
  const { model, apiKey, securityConfig } = getConfig();

  console.log(chalk.bold.blue('\n  CLI Coding Agent'));
  console.log(chalk.dim(`  Provider: OpenRouter | Model: ${model}`));
  console.log(chalk.dim(`  Working directory: ${process.cwd()}`));
  console.log(chalk.green('  Security: ') + chalk.dim('Permission prompts enabled'));
  console.log(chalk.dim('  Commands: exit, clear, trust, untrust'));
  console.log('');

  const llmProvider = createProvider({ apiKey, model });
  const agent = new Agent(llmProvider, securityConfig);

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

      // Built-in commands
      const command = trimmed.toLowerCase();

      if (command === 'exit' || command === 'quit') {
        console.log(chalk.yellow('\nGoodbye!'));
        rl.close();
        process.exit(0);
      }

      if (command === 'clear') {
        agent.clearHistory();
        prompt();
        return;
      }

      if (command === 'trust') {
        agent.setSecurityConfig({
          autoApproveSafe: true,
          autoApproveLow: true,
          autoApproveRead: true,
        });
        console.log(chalk.yellow('Trust mode: Auto-approving safe, low-risk, and read operations.'));
        prompt();
        return;
      }

      if (command === 'untrust') {
        agent.setSecurityConfig({
          autoApproveSafe: true,
          autoApproveLow: false,
          autoApproveRead: false,
        });
        console.log(chalk.yellow('Strict mode: Requiring confirmation for most operations.'));
        prompt();
        return;
      }

      if (command === 'help') {
        console.log(chalk.cyan('\nAvailable commands:'));
        console.log('  exit, quit  - Exit the agent');
        console.log('  clear       - Clear conversation history');
        console.log('  trust       - Enable trust mode (fewer prompts)');
        console.log('  untrust     - Enable strict mode (more prompts)');
        console.log('  help        - Show this help message');
        console.log('');
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
