import { OpenRouterProvider } from './openrouter.js';
import type { LLMProvider, ProviderConfig } from './types.js';

export type { LLMProvider, Message, ToolDefinition, StreamEvent, ToolCall, ToolResult, ContentBlock } from './types.js';

export function createProvider(config: ProviderConfig): LLMProvider {
  return new OpenRouterProvider(config);
}
