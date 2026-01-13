import { glob } from 'glob';
import { resolve } from 'path';
import type { ToolDefinition } from '../llm/types.js';

export const globTool: ToolDefinition = {
  name: 'glob',
  description: 'Find files matching a glob pattern. Use patterns like "**/*.ts" to find TypeScript files, or "src/**/*.js" to find JavaScript files in src.',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The glob pattern to match files (e.g., "**/*.ts", "src/**/*.js")',
      },
      path: {
        type: 'string',
        description: 'The directory to search in (default: current working directory)',
      },
    },
    required: ['pattern'],
  },
};

export async function executeGlob(args: Record<string, unknown>): Promise<string> {
  const pattern = args.pattern as string;
  const basePath = args.path ? resolve(process.cwd(), args.path as string) : process.cwd();

  const files = await glob(pattern, {
    cwd: basePath,
    nodir: true,
    ignore: ['**/node_modules/**', '**/.git/**'],
  });

  if (files.length === 0) {
    return 'No files found matching the pattern.';
  }

  // Limit output
  const maxFiles = 100;
  const displayFiles = files.slice(0, maxFiles);
  let result = displayFiles.join('\n');

  if (files.length > maxFiles) {
    result += `\n\n... and ${files.length - maxFiles} more files`;
  }

  return `Found ${files.length} file(s):\n${result}`;
}
