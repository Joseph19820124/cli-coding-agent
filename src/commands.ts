import chalk from 'chalk';
import type { Agent } from './agent.js';
import {
  listSessions,
  loadSession,
  saveSession,
  deleteSession,
  displaySessions,
  loadConfig,
  saveConfig,
  type Session,
} from './storage.js';
import { clearTodoList, displayTodoList, getTodoList } from './tools/todo.js';

export interface CommandContext {
  agent: Agent;
  currentSessionId: string | null;
  setSessionId: (id: string | null) => void;
  exit: () => void;
}

export interface Command {
  name: string;
  aliases: string[];
  description: string;
  usage?: string;
  execute: (args: string[], ctx: CommandContext) => Promise<boolean>;
}

// All available commands
const commands: Command[] = [
  {
    name: 'help',
    aliases: ['h', '?'],
    description: 'Show available commands',
    execute: async () => {
      console.log(chalk.cyan('\n━━━ Available Commands ━━━\n'));

      const categories = [
        {
          name: 'General',
          cmds: ['help', 'exit', 'clear'],
        },
        {
          name: 'Session',
          cmds: ['save', 'load', 'sessions', 'delete', 'new'],
        },
        {
          name: 'Security',
          cmds: ['trust', 'untrust'],
        },
        {
          name: 'Info',
          cmds: ['tools', 'todos', 'status'],
        },
        {
          name: 'Config',
          cmds: ['config'],
        },
      ];

      for (const cat of categories) {
        console.log(chalk.dim(`  ${cat.name}:`));
        for (const cmdName of cat.cmds) {
          const cmd = commands.find((c) => c.name === cmdName);
          if (cmd) {
            const aliasStr = cmd.aliases.length > 0 ? chalk.dim(` (${cmd.aliases.join(', ')})`) : '';
            console.log(`    /${cmd.name}${aliasStr} - ${cmd.description}`);
          }
        }
        console.log('');
      }

      return true;
    },
  },
  {
    name: 'exit',
    aliases: ['quit', 'q'],
    description: 'Exit the agent',
    execute: async (_, ctx) => {
      console.log(chalk.yellow('\nGoodbye!'));
      ctx.exit();
      return true;
    },
  },
  {
    name: 'clear',
    aliases: ['c'],
    description: 'Clear conversation history',
    execute: async (_, ctx) => {
      ctx.agent.clearHistory();
      ctx.setSessionId(null);
      clearTodoList();
      return true;
    },
  },
  {
    name: 'save',
    aliases: ['s'],
    description: 'Save current session',
    usage: '/save [name]',
    execute: async (args, ctx) => {
      const name = args.join(' ') || undefined;
      const messages = ctx.agent.getMessages();

      if (messages.length === 0) {
        console.log(chalk.yellow('No messages to save.'));
        return true;
      }

      const session = await saveSession(messages, name, ctx.currentSessionId || undefined);
      ctx.setSessionId(session.id);
      console.log(chalk.green(`Session saved: ${session.id}`));
      return true;
    },
  },
  {
    name: 'load',
    aliases: ['l'],
    description: 'Load a saved session',
    usage: '/load <session-id>',
    execute: async (args, ctx) => {
      if (args.length === 0) {
        // Show recent sessions
        const sessions = await listSessions();
        displaySessions(sessions);
        console.log(chalk.dim('  Usage: /load <session-id>'));
        return true;
      }

      const sessionId = args[0];
      const session = await loadSession(sessionId);

      if (!session) {
        console.log(chalk.red(`Session not found: ${sessionId}`));
        return true;
      }

      ctx.agent.loadMessages(session.messages);
      ctx.setSessionId(session.id);
      console.log(chalk.green(`Loaded session: ${session.name}`));
      console.log(chalk.dim(`  ${session.messages.length} messages`));
      return true;
    },
  },
  {
    name: 'sessions',
    aliases: ['ls'],
    description: 'List saved sessions',
    execute: async () => {
      const sessions = await listSessions();
      displaySessions(sessions);
      return true;
    },
  },
  {
    name: 'delete',
    aliases: ['rm'],
    description: 'Delete a saved session',
    usage: '/delete <session-id>',
    execute: async (args) => {
      if (args.length === 0) {
        console.log(chalk.yellow('Usage: /delete <session-id>'));
        return true;
      }

      const sessionId = args[0];
      const deleted = await deleteSession(sessionId);

      if (deleted) {
        console.log(chalk.green(`Deleted session: ${sessionId}`));
      } else {
        console.log(chalk.red(`Session not found: ${sessionId}`));
      }
      return true;
    },
  },
  {
    name: 'new',
    aliases: ['n'],
    description: 'Start a new session',
    execute: async (_, ctx) => {
      ctx.agent.clearHistory();
      ctx.setSessionId(null);
      clearTodoList();
      console.log(chalk.green('Started new session.'));
      return true;
    },
  },
  {
    name: 'trust',
    aliases: [],
    description: 'Enable trust mode (fewer prompts)',
    execute: async (_, ctx) => {
      ctx.agent.setSecurityConfig({
        autoApproveSafe: true,
        autoApproveLow: true,
        autoApproveRead: true,
      });
      console.log(chalk.yellow('Trust mode: Auto-approving safe, low-risk, and read operations.'));
      return true;
    },
  },
  {
    name: 'untrust',
    aliases: [],
    description: 'Enable strict mode (more prompts)',
    execute: async (_, ctx) => {
      ctx.agent.setSecurityConfig({
        autoApproveSafe: true,
        autoApproveLow: false,
        autoApproveRead: false,
      });
      console.log(chalk.yellow('Strict mode: Requiring confirmation for most operations.'));
      return true;
    },
  },
  {
    name: 'tools',
    aliases: ['t'],
    description: 'List available tools',
    execute: async () => {
      console.log(chalk.cyan('\n━━━ Available Tools ━━━\n'));
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
      return true;
    },
  },
  {
    name: 'todos',
    aliases: ['td'],
    description: 'Show current todo list',
    execute: async () => {
      const todos = getTodoList();
      if (todos.length === 0) {
        console.log(chalk.dim('No todos.'));
      } else {
        displayTodoList();
      }
      return true;
    },
  },
  {
    name: 'status',
    aliases: ['st'],
    description: 'Show current status',
    execute: async (_, ctx) => {
      const messages = ctx.agent.getMessages();
      const todos = getTodoList();

      console.log(chalk.cyan('\n━━━ Status ━━━\n'));
      console.log(`  Session: ${ctx.currentSessionId || chalk.dim('(unsaved)')}`);
      console.log(`  Messages: ${messages.length}`);
      console.log(`  Todos: ${todos.length}`);
      console.log(`  Working dir: ${process.cwd()}`);
      console.log('');
      return true;
    },
  },
  {
    name: 'config',
    aliases: ['cfg'],
    description: 'View or set configuration',
    usage: '/config [key] [value]',
    execute: async (args) => {
      const config = await loadConfig();

      if (args.length === 0) {
        // Show config
        console.log(chalk.cyan('\n━━━ Configuration ━━━\n'));
        console.log(`  defaultModel: ${config.defaultModel || chalk.dim('(not set)')}`);
        console.log(`  autoApproveSafe: ${config.autoApproveSafe ?? true}`);
        console.log(`  autoApproveLow: ${config.autoApproveLow ?? false}`);
        console.log(`  autoApproveRead: ${config.autoApproveRead ?? false}`);
        console.log(`  maxHistorySessions: ${config.maxHistorySessions ?? 50}`);
        console.log('');
        console.log(chalk.dim('  Usage: /config <key> <value>'));
        console.log('');
        return true;
      }

      if (args.length >= 2) {
        const key = args[0];
        const value = args.slice(1).join(' ');

        // Parse value
        let parsedValue: string | boolean | number = value;
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (/^\d+$/.test(value)) parsedValue = parseInt(value);

        (config as Record<string, unknown>)[key] = parsedValue;
        await saveConfig(config);
        console.log(chalk.green(`Config updated: ${key} = ${parsedValue}`));
      }

      return true;
    },
  },
];

// Find command by name or alias
export function findCommand(input: string): Command | null {
  const name = input.toLowerCase();
  return commands.find((cmd) => cmd.name === name || cmd.aliases.includes(name)) || null;
}

// Parse command input
export function parseCommand(input: string): { command: string; args: string[] } | null {
  if (!input.startsWith('/')) {
    return null;
  }

  const parts = input.slice(1).trim().split(/\s+/);
  const command = parts[0] || '';
  const args = parts.slice(1);

  return { command, args };
}

// Execute command
export async function executeCommand(
  input: string,
  ctx: CommandContext
): Promise<{ handled: boolean; shouldContinue: boolean }> {
  const parsed = parseCommand(input);

  if (!parsed) {
    return { handled: false, shouldContinue: true };
  }

  const cmd = findCommand(parsed.command);

  if (!cmd) {
    console.log(chalk.red(`Unknown command: /${parsed.command}`));
    console.log(chalk.dim('Type /help for available commands.'));
    return { handled: true, shouldContinue: true };
  }

  const shouldContinue = await cmd.execute(parsed.args, ctx);
  return { handled: true, shouldContinue };
}

// Get all command names for autocomplete
export function getAllCommandNames(): string[] {
  const names: string[] = [];
  for (const cmd of commands) {
    names.push(cmd.name);
    names.push(...cmd.aliases);
  }
  return names;
}
