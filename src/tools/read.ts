import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { ToolDefinition } from '../llm/types.js';

export const readTool: ToolDefinition = {
  name: 'read',
  description: 'Read the contents of a file. Use this to examine source code, configuration files, or any text file.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to read (absolute or relative to current working directory)',
      },
    },
    required: ['path'],
  },
};

export async function executeRead(args: Record<string, unknown>): Promise<string> {
  const path = args.path as string;
  const absolutePath = resolve(process.cwd(), path);

  try {
    const content = await readFile(absolutePath, 'utf-8');
    const lines = content.split('\n');
    const numberedLines = lines.map((line, i) => `${String(i + 1).padStart(4)}  ${line}`);
    return numberedLines.join('\n');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return `Error: File not found: ${absolutePath}`;
    }
    throw error;
  }
}
