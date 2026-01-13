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
  console.log(chalk.dim('  Commands: help, tools, trust, clear, exit'));
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
        console.log('  tools       - List available tools');
        console.log('  help        - Show this help message');
        console.log('');
        prompt();
        return;
      }

      if (command === 'tools') {
        console.log(chalk.cyan('\nAvailable tools:'));
        console.log(chalk.dim('  File Operations:'));
        console.log('    read, write, edit');
        console.log(chalk.dim('  Execution:'));
        console.log('    bash');
        console.log(chalk.dim('  Search:'));
        console.log('    glob, grep');
        console.log(chalk.dim('  Task Management:'));
        console.log('    todo_write, create_plan');
        console.log(chalk.dim('  User Interaction:'));
        console.log('    ask_user');
        console.log(chalk.dim('  Web:'));
        console.log('    web_fetch');
        console.log(chalk.dim('  Subagents:'));
        console.log('    subagent (explore, search, analyze)');
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
