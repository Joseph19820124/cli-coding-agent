import type { ToolDefinition } from '../llm/types.js';
import { readTool, executeRead } from './read.js';
import { writeTool, executeWrite } from './write.js';
import { editTool, executeEdit } from './edit.js';
import { bashTool, executeBash } from './bash.js';
import { globTool, executeGlob } from './glob.js';
import { grepTool, executeGrep } from './grep.js';
import { todoWriteTool, executeTodoWrite } from './todo.js';
import { askUserTool, executeAskUser } from './ask.js';
import { webFetchTool, executeWebFetch } from './webfetch.js';
import { subagentTool, executeSubagent } from './subagent.js';
import { planTool, executeCreatePlan } from '../planner.js';

// Tool executor type
export type ToolExecutor = (args: Record<string, unknown>) => Promise<string>;

// Registry of all tools
const toolRegistry: Map<string, {
  definition: ToolDefinition;
  execute: ToolExecutor;
  requiresSequential?: boolean;  // Some tools must run sequentially (e.g., ask_user)
}> = new Map();

// Register all tools
function registerTool(
  definition: ToolDefinition,
  execute: ToolExecutor,
  options?: { requiresSequential?: boolean }
) {
  toolRegistry.set(definition.name, {
    definition,
    execute,
    requiresSequential: options?.requiresSequential,
  });
}

// Initialize tools
// File operations
registerTool(readTool, executeRead);
registerTool(writeTool, executeWrite);
registerTool(editTool, executeEdit);

// Execution
registerTool(bashTool, executeBash);

// Search
registerTool(globTool, executeGlob);
registerTool(grepTool, executeGrep);

// Task management
registerTool(todoWriteTool, executeTodoWrite);

// User interaction (sequential)
registerTool(askUserTool, executeAskUser, { requiresSequential: true });

// Web
registerTool(webFetchTool, executeWebFetch);

// Planning (sequential - needs user approval)
registerTool(planTool, executeCreatePlan, { requiresSequential: true });

// Subagent (sequential - complex operations)
registerTool(subagentTool, executeSubagent, { requiresSequential: true });

// Get all tool definitions
export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values()).map((t) => t.definition);
}

// Check if a tool requires sequential execution
export function requiresSequentialExecution(name: string): boolean {
  const tool = toolRegistry.get(name);
  return tool?.requiresSequential ?? false;
}

// Execute a tool by name
export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const tool = toolRegistry.get(name);
  if (!tool) {
    return `Error: Unknown tool "${name}"`;
  }
  try {
    return await tool.execute(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error executing ${name}: ${message}`;
  }
}

// Execute multiple tools in parallel (for tools that support it)
export async function executeToolsParallel(
  calls: Array<{ name: string; args: Record<string, unknown> }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Separate sequential and parallel tools
  const sequential = calls.filter((c) => requiresSequentialExecution(c.name));
  const parallel = calls.filter((c) => !requiresSequentialExecution(c.name));

  // Execute parallel tools concurrently
  if (parallel.length > 0) {
    const parallelResults = await Promise.all(
      parallel.map(async (call) => {
        const result = await executeTool(call.name, call.args);
        return { name: call.name, result };
      })
    );
    for (const { name, result } of parallelResults) {
      results.set(name, result);
    }
  }

  // Execute sequential tools one by one
  for (const call of sequential) {
    const result = await executeTool(call.name, call.args);
    results.set(call.name, result);
  }

  return results;
}
