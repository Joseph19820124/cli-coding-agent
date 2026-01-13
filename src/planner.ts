import * as readline from 'readline';
import chalk from 'chalk';

export interface PlanStep {
  id: number;
  description: string;
  tools?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

export interface Plan {
  title: string;
  description: string;
  steps: PlanStep[];
  approved: boolean;
}

let currentPlan: Plan | null = null;
let planMode = false;

export function isPlanMode(): boolean {
  return planMode;
}

export function enterPlanMode(): void {
  planMode = true;
  currentPlan = null;
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan('  PLAN MODE ACTIVATED'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.dim('  The agent will create a plan before executing.'));
  console.log(chalk.dim('  You can review and approve the plan.'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');
}

export function exitPlanMode(): void {
  planMode = false;
  currentPlan = null;
  console.log(chalk.yellow('Plan mode deactivated.'));
}

export function createPlan(title: string, description: string, steps: string[]): Plan {
  currentPlan = {
    title,
    description,
    steps: steps.map((desc, i) => ({
      id: i + 1,
      description: desc,
      status: 'pending',
    })),
    approved: false,
  };
  return currentPlan;
}

export function getCurrentPlan(): Plan | null {
  return currentPlan;
}

export function displayPlan(plan: Plan): void {
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold(`  📋 PLAN: ${plan.title}`));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.dim(`  ${plan.description}`));
  console.log('');

  for (const step of plan.steps) {
    const icon = getStepIcon(step.status);
    const color = getStepColor(step.status);
    console.log(`  ${icon} ${color(`Step ${step.id}:`)} ${step.description}`);
    if (step.tools && step.tools.length > 0) {
      console.log(chalk.dim(`     Tools: ${step.tools.join(', ')}`));
    }
  }

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
}

function getStepIcon(status: PlanStep['status']): string {
  switch (status) {
    case 'pending':
      return chalk.gray('○');
    case 'approved':
      return chalk.blue('◉');
    case 'rejected':
      return chalk.red('✗');
    case 'completed':
      return chalk.green('●');
  }
}

function getStepColor(status: PlanStep['status']): (text: string) => string {
  switch (status) {
    case 'pending':
      return chalk.gray;
    case 'approved':
      return chalk.blue;
    case 'rejected':
      return chalk.red;
    case 'completed':
      return chalk.green;
  }
}

export async function askPlanApproval(plan: Plan): Promise<boolean> {
  displayPlan(plan);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log(chalk.yellow('  Options:'));
    console.log(chalk.dim('    y/yes  - Approve and execute the plan'));
    console.log(chalk.dim('    n/no   - Reject the plan'));
    console.log(chalk.dim('    m/modify - Ask agent to modify the plan'));
    console.log('');

    rl.question(chalk.yellow('  Approve this plan? [y/n/m]: '), (answer) => {
      rl.close();
      const response = answer.trim().toLowerCase();

      if (response === 'y' || response === 'yes') {
        plan.approved = true;
        plan.steps.forEach((step) => {
          step.status = 'approved';
        });
        console.log(chalk.green('  ✓ Plan approved! Executing...\n'));
        resolve(true);
      } else if (response === 'm' || response === 'modify') {
        console.log(chalk.yellow('  → Please tell the agent how to modify the plan.\n'));
        resolve(false);
      } else {
        plan.steps.forEach((step) => {
          step.status = 'rejected';
        });
        console.log(chalk.red('  ✗ Plan rejected.\n'));
        resolve(false);
      }
    });
  });
}

export function updateStepStatus(stepId: number, status: PlanStep['status']): void {
  if (currentPlan) {
    const step = currentPlan.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = status;
    }
  }
}

export function clearPlan(): void {
  currentPlan = null;
}

// Tool definition for plan mode
import type { ToolDefinition } from './llm/types.js';

export const planTool: ToolDefinition = {
  name: 'create_plan',
  description: `Create a plan for a complex task. Use this when:
- The task has multiple steps
- The task requires careful sequencing
- You want user approval before executing

The plan will be shown to the user for approval before any actions are taken.
Include clear, actionable steps in the plan.`,
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Short title for the plan',
      },
      description: {
        type: 'string',
        description: 'Brief description of what the plan accomplishes',
      },
      steps: {
        type: 'string',
        description: 'JSON array of step descriptions, e.g., ["Step 1", "Step 2"]',
      },
    },
    required: ['title', 'description', 'steps'],
  },
};

export async function executeCreatePlan(args: Record<string, unknown>): Promise<string> {
  const title = args.title as string;
  const description = args.description as string;
  let steps: string[];

  try {
    steps = JSON.parse(args.steps as string);
  } catch {
    return 'Error: steps must be a valid JSON array of strings';
  }

  const plan = createPlan(title, description, steps);
  const approved = await askPlanApproval(plan);

  if (approved) {
    return `Plan "${title}" approved with ${steps.length} steps. Proceeding with execution.`;
  } else {
    return `Plan "${title}" was not approved. Please modify your approach or ask the user for guidance.`;
  }
}
