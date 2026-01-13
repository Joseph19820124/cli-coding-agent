import chalk from 'chalk';
import type { ToolDefinition } from '../llm/types.js';

export const webFetchTool: ToolDefinition = {
  name: 'web_fetch',
  description: `Fetch content from a URL and return it as text. Use this to:
- Read documentation from the web
- Fetch API responses
- Get content from GitHub raw files
- Read online resources

The tool will attempt to extract readable text content from HTML pages.
For JSON APIs, it will return the formatted JSON.`,
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch content from',
      },
      extract_text: {
        type: 'string',
        description: 'Set to "true" to extract text from HTML (default: true)',
      },
    },
    required: ['url'],
  },
};

export async function executeWebFetch(args: Record<string, unknown>): Promise<string> {
  const url = args.url as string;
  const extractText = args.extract_text !== 'false';

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return `Error: Invalid URL: ${url}`;
  }

  // Only allow http and https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return `Error: Only HTTP and HTTPS URLs are supported`;
  }

  console.log(chalk.dim(`  Fetching: ${url}`));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CLI-Coding-Agent/1.0',
        'Accept': 'text/html,application/json,text/plain,*/*',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return `Error: HTTP ${response.status} ${response.statusText}`;
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    // Handle JSON
    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        return JSON.stringify(json, null, 2);
      } catch {
        return text;
      }
    }

    // Handle HTML - extract text content
    if (contentType.includes('text/html') && extractText) {
      return extractTextFromHtml(text);
    }

    // Return raw text for other content types
    return text.slice(0, 50000); // Limit output size
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return 'Error: Request timed out after 30 seconds';
      }
      return `Error: ${error.message}`;
    }
    return `Error: Failed to fetch URL`;
  }
}

function extractTextFromHtml(html: string): string {
  // Remove script and style tags and their content
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

  // Replace common block elements with newlines
  text = text
    .replace(/<\/?(p|div|br|hr|h[1-6]|li|tr|td|th|blockquote|pre|article|section|header|footer|nav|aside)[^>]*>/gi, '\n')
    .replace(/<\/?(ul|ol|table|thead|tbody)[^>]*>/gi, '\n\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));

  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, ' ')           // Multiple spaces/tabs to single space
    .replace(/\n[ \t]+/g, '\n')        // Remove leading whitespace from lines
    .replace(/[ \t]+\n/g, '\n')        // Remove trailing whitespace from lines
    .replace(/\n{3,}/g, '\n\n')        // Multiple newlines to double newline
    .trim();

  // Limit output size
  if (text.length > 30000) {
    text = text.slice(0, 30000) + '\n\n... (content truncated)';
  }

  return text;
}
