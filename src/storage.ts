import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import type { Message } from './llm/types.js';

// Storage directory
const STORAGE_DIR = join(homedir(), '.cli-agent');
const SESSIONS_DIR = join(STORAGE_DIR, 'sessions');
const CONFIG_FILE = join(STORAGE_DIR, 'config.json');

// Session data structure
export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  metadata?: {
    workingDirectory?: string;
    model?: string;
  };
}

// Config structure
export interface Config {
  defaultModel?: string;
  autoApproveSafe?: boolean;
  autoApproveLow?: boolean;
  autoApproveRead?: boolean;
  theme?: 'default' | 'minimal';
  maxHistorySessions?: number;
}

// Ensure storage directories exist
export async function ensureStorageDir(): Promise<void> {
  try {
    await mkdir(STORAGE_DIR, { recursive: true });
    await mkdir(SESSIONS_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Generate session ID
function generateSessionId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  const random = Math.random().toString(36).slice(2, 6);
  return `${date}-${time}-${random}`;
}

// Save session
export async function saveSession(
  messages: Message[],
  name?: string,
  existingId?: string
): Promise<Session> {
  await ensureStorageDir();

  const id = existingId || generateSessionId();
  const now = new Date().toISOString();

  const session: Session = {
    id,
    name: name || `Session ${id}`,
    createdAt: existingId ? (await loadSession(id))?.createdAt || now : now,
    updatedAt: now,
    messages,
    metadata: {
      workingDirectory: process.cwd(),
    },
  };

  const filePath = join(SESSIONS_DIR, `${id}.json`);
  await writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');

  return session;
}

// Load session
export async function loadSession(id: string): Promise<Session | null> {
  try {
    const filePath = join(SESSIONS_DIR, `${id}.json`);
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as Session;
  } catch {
    return null;
  }
}

// List all sessions
export async function listSessions(): Promise<Session[]> {
  await ensureStorageDir();

  try {
    const files = await readdir(SESSIONS_DIR);
    const sessions: Session[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await readFile(join(SESSIONS_DIR, file), 'utf-8');
          sessions.push(JSON.parse(content));
        } catch {
          // Skip invalid files
        }
      }
    }

    // Sort by updatedAt descending
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return sessions;
  } catch {
    return [];
  }
}

// Delete session
export async function deleteSession(id: string): Promise<boolean> {
  try {
    const filePath = join(SESSIONS_DIR, `${id}.json`);
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

// Load config
export async function loadConfig(): Promise<Config> {
  await ensureStorageDir();

  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content) as Config;
  } catch {
    return {};
  }
}

// Save config
export async function saveConfig(config: Config): Promise<void> {
  await ensureStorageDir();
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// Display sessions list
export function displaySessions(sessions: Session[]): void {
  if (sessions.length === 0) {
    console.log(chalk.dim('  No saved sessions.'));
    return;
  }

  console.log('');
  console.log(chalk.cyan('━━━ Saved Sessions ━━━'));

  for (const session of sessions.slice(0, 10)) {
    const date = new Date(session.updatedAt).toLocaleString();
    const msgCount = session.messages.length;
    console.log(`  ${chalk.yellow(session.id)} - ${session.name}`);
    console.log(chalk.dim(`    ${date} | ${msgCount} messages`));
  }

  if (sessions.length > 10) {
    console.log(chalk.dim(`  ... and ${sessions.length - 10} more`));
  }
  console.log('');
}

// Get recent session
export async function getRecentSession(): Promise<Session | null> {
  const sessions = await listSessions();
  return sessions.length > 0 ? sessions[0] : null;
}

// Clean old sessions (keep max N)
export async function cleanOldSessions(maxKeep: number = 50): Promise<number> {
  const sessions = await listSessions();
  let deleted = 0;

  if (sessions.length > maxKeep) {
    const toDelete = sessions.slice(maxKeep);
    for (const session of toDelete) {
      if (await deleteSession(session.id)) {
        deleted++;
      }
    }
  }

  return deleted;
}
