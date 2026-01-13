import type { ToolDefinition } from '../llm/types.js';
import { readTool, executeRead } from './read.js';
import { writeTool, executeWrite } from './write.js';
import { editTool, executeEdit } from './edit.js';
import { bashTool, executeBash } from './bash.js';
import { globTool, executeGlob } from './glob.js';
import { grepTool, executeGrep } from './grep.js';

// Tool executor type
export type ToolExecutor = (args: Record<string, unknown>) => Promise<string>;

// Registry of all tools
const toolRegistry: Map<string, {
  definition: ToolDefinition;
  execute: ToolExecutor;
}> = new Map();

// Register all tools
function registerTool(definition: ToolDefinition, execute: ToolExecutor) {
  toolRegistry.set(definition.name, { definition, execute });
}

// Initialize tools
registerTool(readTool, executeRead);
registerTool(writeTool, executeWrite);
registerTool(editTool, executeEdit);
registerTool(bashTool, executeBash);
registerTool(globTool, executeGlob);
registerTool(grepTool, executeGrep);

// Get all tool definitions
export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values()).map((t) => t.definition);
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
