import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import type { ToolDefinition } from '../llm/types.js';

export const writeTool: ToolDefinition = {
  name: 'write',
  description: 'Write content to a file. Creates the file if it does not exist, or overwrites if it does. Creates parent directories as needed.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to write (absolute or relative to current working directory)',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
    },
    required: ['path', 'content'],
  },
};

export async function executeWrite(args: Record<string, unknown>): Promise<string> {
  const path = args.path as string;
  const content = args.content as string;
  const absolutePath = resolve(process.cwd(), path);

  // Ensure parent directory exists
  await mkdir(dirname(absolutePath), { recursive: true });

  await writeFile(absolutePath, content, 'utf-8');
  return `Successfully wrote ${content.length} characters to ${absolutePath}`;
}
