import * as readline from 'readline';
import chalk from 'chalk';
import type { ToolDefinition } from '../llm/types.js';

export const askUserTool: ToolDefinition = {
  name: 'ask_user',
  description: `Ask the user a question when you need clarification or input. Use this to:
- Gather user preferences
- Clarify ambiguous instructions
- Get decisions on implementation choices
- Confirm before making significant changes

The user will be presented with the question and can type their response.
You can optionally provide choices for the user to select from.`,
  parameters: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The question to ask the user',
      },
      choices: {
        type: 'string',
        description: 'Optional comma-separated list of choices (e.g., "Option A, Option B, Option C")',
      },
      default_choice: {
        type: 'string',
        description: 'Optional default choice if user just presses Enter',
      },
    },
    required: ['question'],
  },
};

export async function executeAskUser(args: Record<string, unknown>): Promise<string> {
  const question = args.question as string;
  const choicesStr = args.choices as string | undefined;
  const defaultChoice = args.default_choice as string | undefined;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('');
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(chalk.cyan('  QUESTION FROM AGENT'));
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(`  ${question}`);

    // Parse and display choices if provided
    let choices: string[] = [];
    if (choicesStr) {
      choices = choicesStr.split(',').map((c) => c.trim());
      console.log('');
      choices.forEach((choice, i) => {
        const marker = defaultChoice === choice ? chalk.green(`  ${i + 1}. ${choice} (default)`) : chalk.dim(`  ${i + 1}. ${choice}`);
        console.log(marker);
      });
    }

    if (defaultChoice && !choicesStr) {
      console.log(chalk.dim(`  Default: ${defaultChoice}`));
    }

    console.log(chalk.cyan('━'.repeat(60)));

    const promptText = choices.length > 0
      ? chalk.cyan('  Your choice (number or text): ')
      : chalk.cyan('  Your answer: ');

    rl.question(promptText, (answer) => {
      rl.close();
      const trimmed = answer.trim();

      // Handle empty input with default
      if (!trimmed && defaultChoice) {
        console.log(chalk.dim(`  → Using default: ${defaultChoice}`));
        console.log('');
        resolve(`User selected: ${defaultChoice}`);
        return;
      }

      // Handle numeric choice
      if (choices.length > 0 && /^\d+$/.test(trimmed)) {
        const index = parseInt(trimmed) - 1;
        if (index >= 0 && index < choices.length) {
          console.log(chalk.dim(`  → Selected: ${choices[index]}`));
          console.log('');
          resolve(`User selected: ${choices[index]}`);
          return;
        }
      }

      // Handle text input
      if (trimmed) {
        console.log('');
        resolve(`User answered: ${trimmed}`);
        return;
      }

      console.log(chalk.dim('  → No answer provided'));
      console.log('');
      resolve('User did not provide an answer');
    });
  });
}
