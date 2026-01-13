import { spawn } from 'child_process';
import { resolve } from 'path';
import type { ToolDefinition } from '../llm/types.js';

export const grepTool: ToolDefinition = {
  name: 'grep',
  description: 'Search for a pattern in files. Uses ripgrep (rg) if available, falls back to grep. Supports regex patterns.',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The regex pattern to search for',
      },
      path: {
        type: 'string',
        description: 'The file or directory to search in (default: current working directory)',
      },
      type: {
        type: 'string',
        description: 'File type to search (e.g., "ts", "js", "py")',
      },
    },
    required: ['pattern'],
  },
};

export async function executeGrep(args: Record<string, unknown>): Promise<string> {
  const pattern = args.pattern as string;
  const searchPath = args.path ? resolve(process.cwd(), args.path as string) : process.cwd();
  const fileType = args.type as string | undefined;

  // Try ripgrep first, fall back to grep
  return tryRipgrep(pattern, searchPath, fileType).catch(() =>
    tryGrep(pattern, searchPath)
  );
}

async function tryRipgrep(pattern: string, path: string, fileType?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rgArgs = [
      '--line-number',
      '--color=never',
      '--max-count=100',
      '--glob=!node_modules',
      '--glob=!.git',
    ];

    if (fileType) {
      rgArgs.push(`--type=${fileType}`);
    }

    rgArgs.push(pattern, path);

    const proc = spawn('rg', rgArgs);
    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', () => {
      // Ignore stderr
    });

    proc.on('close', (code) => {
      if (code === 0 || code === 1) {
        // code 1 means no matches
        resolve(output || 'No matches found.');
      } else {
        reject(new Error('ripgrep failed'));
      }
    });

    proc.on('error', () => {
      reject(new Error('ripgrep not found'));
    });
  });
}

async function tryGrep(pattern: string, path: string): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn('grep', [
      '-r',
      '-n',
      '--include=*.*',
      '--exclude-dir=node_modules',
      '--exclude-dir=.git',
      pattern,
      path,
    ]);

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', () => {
      // Limit output
      const lines = output.split('\n').slice(0, 100);
      resolve(lines.join('\n') || 'No matches found.');
    });

    proc.on('error', () => {
      resolve('Error: grep command failed');
    });
  });
}
