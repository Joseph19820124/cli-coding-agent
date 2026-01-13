import { spawn } from 'child_process';
import type { ToolDefinition } from '../llm/types.js';

export const bashTool: ToolDefinition = {
  name: 'bash',
  description: 'Execute a bash command in the shell. Use this for running programs, git commands, npm commands, etc.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to execute',
      },
      timeout: {
        type: 'string',
        description: 'Timeout in milliseconds (default: 30000)',
      },
    },
    required: ['command'],
  },
};

export async function executeBash(args: Record<string, unknown>): Promise<string> {
  const command = args.command as string;
  const timeout = parseInt(args.timeout as string) || 30000;

  return new Promise((resolve) => {
    const proc = spawn('bash', ['-c', command], {
      cwd: process.cwd(),
      timeout,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      let result = '';
      if (stdout) {
        result += stdout;
      }
      if (stderr) {
        result += (result ? '\n' : '') + `stderr: ${stderr}`;
      }
      if (code !== 0) {
        result += (result ? '\n' : '') + `Exit code: ${code}`;
      }
      resolve(result || '(no output)');
    });

    proc.on('error', (error) => {
      resolve(`Error: ${error.message}`);
    });
  });
}
