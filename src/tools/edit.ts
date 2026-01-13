import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import type { ToolDefinition } from '../llm/types.js';

export const editTool: ToolDefinition = {
  name: 'edit',
  description: 'Edit a file by replacing a specific string with new content. The old_string must match exactly (including whitespace and indentation).',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to edit',
      },
      old_string: {
        type: 'string',
        description: 'The exact string to find and replace (must be unique in the file)',
      },
      new_string: {
        type: 'string',
        description: 'The string to replace it with',
      },
    },
    required: ['path', 'old_string', 'new_string'],
  },
};

export async function executeEdit(args: Record<string, unknown>): Promise<string> {
  const path = args.path as string;
  const oldString = args.old_string as string;
  const newString = args.new_string as string;
  const absolutePath = resolve(process.cwd(), path);

  // Read the file
  let content: string;
  try {
    content = await readFile(absolutePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return `Error: File not found: ${absolutePath}`;
    }
    throw error;
  }

  // Check if old_string exists and is unique
  const occurrences = content.split(oldString).length - 1;
  if (occurrences === 0) {
    return `Error: The string to replace was not found in the file. Make sure it matches exactly including whitespace.`;
  }
  if (occurrences > 1) {
    return `Error: The string to replace was found ${occurrences} times. It must be unique. Provide more context to make it unique.`;
  }

  // Replace and write
  const newContent = content.replace(oldString, newString);
  await writeFile(absolutePath, newContent, 'utf-8');

  return `Successfully edited ${absolutePath}`;
}
