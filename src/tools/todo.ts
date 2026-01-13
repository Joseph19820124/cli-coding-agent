import chalk from 'chalk';
import type { ToolDefinition } from '../llm/types.js';

// Todo item structure
export interface TodoItem {
  id: number;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// Global todo list state
let todoList: TodoItem[] = [];
let nextId = 1;

export const todoWriteTool: ToolDefinition = {
  name: 'todo_write',
  description: `Manage a task list to track progress on complex tasks. Use this to:
- Break down complex tasks into smaller steps
- Track progress on multi-step operations
- Show the user what you're working on

Each todo has a status: pending, in_progress, or completed.
Only ONE todo should be in_progress at a time.
Mark todos as completed immediately after finishing them.`,
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform: add, update, remove, clear, list',
        enum: ['add', 'update', 'remove', 'clear', 'list'],
      },
      content: {
        type: 'string',
        description: 'Content of the todo item (for add action)',
      },
      id: {
        type: 'string',
        description: 'ID of the todo item (for update/remove actions)',
      },
      status: {
        type: 'string',
        description: 'New status (for update action): pending, in_progress, completed',
        enum: ['pending', 'in_progress', 'completed'],
      },
    },
    required: ['action'],
  },
};

export async function executeTodoWrite(args: Record<string, unknown>): Promise<string> {
  const action = args.action as string;

  switch (action) {
    case 'add': {
      const content = args.content as string;
      if (!content) {
        return 'Error: content is required for add action';
      }
      const todo: TodoItem = {
        id: nextId++,
        content,
        status: 'pending',
      };
      todoList.push(todo);
      displayTodoList();
      return `Added todo #${todo.id}: ${content}`;
    }

    case 'update': {
      const id = parseInt(args.id as string);
      const status = args.status as TodoItem['status'];
      if (!id || !status) {
        return 'Error: id and status are required for update action';
      }
      const todo = todoList.find((t) => t.id === id);
      if (!todo) {
        return `Error: Todo #${id} not found`;
      }
      todo.status = status;
      displayTodoList();
      return `Updated todo #${id} to ${status}`;
    }

    case 'remove': {
      const id = parseInt(args.id as string);
      if (!id) {
        return 'Error: id is required for remove action';
      }
      const index = todoList.findIndex((t) => t.id === id);
      if (index === -1) {
        return `Error: Todo #${id} not found`;
      }
      todoList.splice(index, 1);
      displayTodoList();
      return `Removed todo #${id}`;
    }

    case 'clear': {
      todoList = [];
      nextId = 1;
      console.log(chalk.dim('Todo list cleared'));
      return 'Todo list cleared';
    }

    case 'list': {
      if (todoList.length === 0) {
        return 'Todo list is empty';
      }
      displayTodoList();
      return formatTodoListText();
    }

    default:
      return `Error: Unknown action "${action}"`;
  }
}

function getStatusIcon(status: TodoItem['status']): string {
  switch (status) {
    case 'pending':
      return chalk.gray('○');
    case 'in_progress':
      return chalk.yellow('◐');
    case 'completed':
      return chalk.green('●');
  }
}

function getStatusColor(status: TodoItem['status']): (text: string) => string {
  switch (status) {
    case 'pending':
      return chalk.gray;
    case 'in_progress':
      return chalk.yellow;
    case 'completed':
      return chalk.green;
  }
}

export function displayTodoList(): void {
  if (todoList.length === 0) return;

  console.log('');
  console.log(chalk.cyan('━━━ Todo List ━━━'));

  for (const todo of todoList) {
    const icon = getStatusIcon(todo.status);
    const color = getStatusColor(todo.status);
    const statusText = todo.status === 'in_progress' ? ' (in progress)' : '';
    console.log(`  ${icon} ${color(`#${todo.id}`)} ${todo.content}${chalk.dim(statusText)}`);
  }

  const completed = todoList.filter((t) => t.status === 'completed').length;
  const total = todoList.length;
  console.log(chalk.dim(`  Progress: ${completed}/${total}`));
  console.log('');
}

function formatTodoListText(): string {
  const lines = todoList.map((todo) => {
    const status = todo.status === 'completed' ? '[x]' : todo.status === 'in_progress' ? '[>]' : '[ ]';
    return `${status} #${todo.id}: ${todo.content}`;
  });
  return lines.join('\n');
}

// Get current todo list (for external access)
export function getTodoList(): TodoItem[] {
  return [...todoList];
}

// Clear todo list (for testing or reset)
export function clearTodoList(): void {
  todoList = [];
  nextId = 1;
}
