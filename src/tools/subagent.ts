import chalk from 'chalk';
import type { ToolDefinition } from '../llm/types.js';
import { executeTool } from './index.js';

// Subagent types with their specialized capabilities
const SUBAGENT_TYPES = {
  explore: {
    name: 'Explore',
    description: 'Explores codebase to understand structure and find relevant files',
    tools: ['glob', 'grep', 'read'],
  },
  search: {
    name: 'Search',
    description: 'Searches for specific code patterns, definitions, or usages',
    tools: ['glob', 'grep'],
  },
  analyze: {
    name: 'Analyze',
    description: 'Analyzes code files to understand implementation details',
    tools: ['read', 'grep'],
  },
};

export const subagentTool: ToolDefinition = {
  name: 'subagent',
  description: `Launch a specialized subagent to handle specific tasks. Subagent types:
- explore: Explore codebase structure, find relevant files
- search: Search for code patterns, function definitions, usages
- analyze: Analyze specific files to understand implementation

Use subagents for complex searches or when you need to explore multiple files.
The subagent will execute a sequence of tool calls and return a summary.`,
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Type of subagent: explore, search, or analyze',
        enum: ['explore', 'search', 'analyze'],
      },
      task: {
        type: 'string',
        description: 'Description of what the subagent should accomplish',
      },
      context: {
        type: 'string',
        description: 'Additional context like file patterns, search terms, or specific files',
      },
    },
    required: ['type', 'task'],
  },
};

interface SubagentResult {
  success: boolean;
  summary: string;
  findings: string[];
  filesExamined: string[];
}

export async function executeSubagent(args: Record<string, unknown>): Promise<string> {
  const type = args.type as keyof typeof SUBAGENT_TYPES;
  const task = args.task as string;
  const context = args.context as string | undefined;

  const agentConfig = SUBAGENT_TYPES[type];
  if (!agentConfig) {
    return `Error: Unknown subagent type "${type}"`;
  }

  console.log('');
  console.log(chalk.magenta('━'.repeat(60)));
  console.log(chalk.magenta(`  🤖 SUBAGENT: ${agentConfig.name}`));
  console.log(chalk.magenta('━'.repeat(60)));
  console.log(chalk.dim(`  Task: ${task}`));
  if (context) {
    console.log(chalk.dim(`  Context: ${context}`));
  }
  console.log(chalk.dim(`  Tools: ${agentConfig.tools.join(', ')}`));
  console.log(chalk.magenta('━'.repeat(60)));
  console.log('');

  try {
    const result = await runSubagent(type, task, context);

    console.log('');
    console.log(chalk.magenta('━'.repeat(60)));
    console.log(chalk.magenta(`  📋 SUBAGENT RESULTS`));
    console.log(chalk.magenta('━'.repeat(60)));
    console.log(chalk.dim(`  Files examined: ${result.filesExamined.length}`));
    console.log(chalk.dim(`  Findings: ${result.findings.length}`));
    console.log(chalk.magenta('━'.repeat(60)));
    console.log('');

    return formatSubagentResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Subagent error: ${message}`;
  }
}

async function runSubagent(
  type: keyof typeof SUBAGENT_TYPES,
  task: string,
  context?: string
): Promise<SubagentResult> {
  const result: SubagentResult = {
    success: true,
    summary: '',
    findings: [],
    filesExamined: [],
  };

  switch (type) {
    case 'explore':
      await runExploreAgent(task, context, result);
      break;
    case 'search':
      await runSearchAgent(task, context, result);
      break;
    case 'analyze':
      await runAnalyzeAgent(task, context, result);
      break;
  }

  // Generate summary
  result.summary = generateSummary(type, task, result);

  return result;
}

async function runExploreAgent(
  task: string,
  context: string | undefined,
  result: SubagentResult
): Promise<void> {
  // Step 1: Find relevant files using glob
  const patterns = extractPatterns(task, context);

  for (const pattern of patterns) {
    console.log(chalk.dim(`  Searching: ${pattern}`));
    const globResult = await executeTool('glob', { pattern });

    const files = globResult.split('\n').filter((f) => f && !f.startsWith('Found') && !f.startsWith('No '));
    result.filesExamined.push(...files.slice(0, 10));

    if (files.length > 0) {
      result.findings.push(`Found ${files.length} files matching "${pattern}"`);
    }
  }

  // Step 2: Search for relevant content
  const searchTerms = extractSearchTerms(task);
  for (const term of searchTerms.slice(0, 3)) {
    console.log(chalk.dim(`  Grepping: ${term}`));
    const grepResult = await executeTool('grep', { pattern: term });

    if (!grepResult.includes('No matches')) {
      const matches = grepResult.split('\n').filter((l) => l.trim()).slice(0, 5);
      if (matches.length > 0) {
        result.findings.push(`Found matches for "${term}": ${matches.length} results`);
      }
    }
  }
}

async function runSearchAgent(
  task: string,
  context: string | undefined,
  result: SubagentResult
): Promise<void> {
  const searchTerms = context ? [context, ...extractSearchTerms(task)] : extractSearchTerms(task);

  for (const term of searchTerms.slice(0, 5)) {
    console.log(chalk.dim(`  Searching: ${term}`));
    const grepResult = await executeTool('grep', { pattern: term });

    if (!grepResult.includes('No matches')) {
      const lines = grepResult.split('\n').filter((l) => l.trim());
      const files = [...new Set(lines.map((l) => l.split(':')[0]).filter(Boolean))];
      result.filesExamined.push(...files);
      result.findings.push(`"${term}": found in ${files.length} file(s)`);
    }
  }
}

async function runAnalyzeAgent(
  task: string,
  context: string | undefined,
  result: SubagentResult
): Promise<void> {
  // Context should contain file paths to analyze
  const files = context ? context.split(',').map((f) => f.trim()) : [];

  if (files.length === 0) {
    // Try to find files from task description
    const patterns = extractPatterns(task, undefined);
    for (const pattern of patterns.slice(0, 2)) {
      const globResult = await executeTool('glob', { pattern });
      const foundFiles = globResult.split('\n').filter((f) => f && !f.startsWith('Found') && !f.startsWith('No '));
      files.push(...foundFiles.slice(0, 3));
    }
  }

  for (const file of files.slice(0, 5)) {
    console.log(chalk.dim(`  Reading: ${file}`));
    const content = await executeTool('read', { path: file });

    if (!content.startsWith('Error:')) {
      result.filesExamined.push(file);

      // Basic analysis
      const lines = content.split('\n').length;
      const functions = (content.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/g) || []).length;
      const classes = (content.match(/class\s+\w+/g) || []).length;
      const imports = (content.match(/^import\s+/gm) || []).length;

      result.findings.push(
        `${file}: ${lines} lines, ${functions} functions, ${classes} classes, ${imports} imports`
      );
    }
  }
}

function extractPatterns(task: string, context?: string): string[] {
  const patterns: string[] = [];
  const combined = `${task} ${context || ''}`.toLowerCase();

  // Common file patterns based on keywords
  if (combined.includes('typescript') || combined.includes('.ts')) {
    patterns.push('**/*.ts');
  }
  if (combined.includes('javascript') || combined.includes('.js')) {
    patterns.push('**/*.js');
  }
  if (combined.includes('component')) {
    patterns.push('**/components/**/*');
  }
  if (combined.includes('test')) {
    patterns.push('**/*.test.*', '**/*.spec.*');
  }
  if (combined.includes('config')) {
    patterns.push('**/config*', '**/*.config.*');
  }
  if (combined.includes('api') || combined.includes('endpoint')) {
    patterns.push('**/api/**/*', '**/routes/**/*');
  }

  // Default patterns
  if (patterns.length === 0) {
    patterns.push('**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx');
  }

  return [...new Set(patterns)];
}

function extractSearchTerms(task: string): string[] {
  const terms: string[] = [];

  // Extract quoted strings
  const quoted = task.match(/"([^"]+)"|'([^']+)'/g);
  if (quoted) {
    terms.push(...quoted.map((q) => q.replace(/['"]/g, '')));
  }

  // Extract likely identifiers (CamelCase or snake_case)
  const identifiers = task.match(/\b[A-Z][a-zA-Z0-9]*\b|\b[a-z]+_[a-z_]+\b/g);
  if (identifiers) {
    terms.push(...identifiers);
  }

  // Extract common programming keywords from task
  const keywords = ['function', 'class', 'interface', 'export', 'import', 'async', 'await'];
  for (const kw of keywords) {
    if (task.toLowerCase().includes(kw)) {
      const contextMatch = task.match(new RegExp(`${kw}\\s+(\\w+)`, 'i'));
      if (contextMatch) {
        terms.push(contextMatch[1]);
      }
    }
  }

  return [...new Set(terms)].slice(0, 10);
}

function generateSummary(
  type: string,
  task: string,
  result: SubagentResult
): string {
  const uniqueFiles = [...new Set(result.filesExamined)];

  let summary = `${type.charAt(0).toUpperCase() + type.slice(1)} task: "${task}"\n`;
  summary += `Examined ${uniqueFiles.length} file(s).\n\n`;

  if (result.findings.length > 0) {
    summary += 'Key findings:\n';
    result.findings.forEach((f, i) => {
      summary += `${i + 1}. ${f}\n`;
    });
  } else {
    summary += 'No significant findings.';
  }

  return summary;
}

function formatSubagentResult(result: SubagentResult): string {
  let output = `## Subagent Summary\n\n${result.summary}\n`;

  if (result.filesExamined.length > 0) {
    const uniqueFiles = [...new Set(result.filesExamined)].slice(0, 20);
    output += `\n### Files Examined (${uniqueFiles.length})\n`;
    uniqueFiles.forEach((f) => {
      output += `- ${f}\n`;
    });
  }

  return output;
}
