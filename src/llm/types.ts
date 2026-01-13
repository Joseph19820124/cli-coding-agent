// Tool definition for LLM
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// Tool call from LLM response
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// Tool result to send back
export interface ToolResult {
  id: string;
  content: string;
  isError?: boolean;
}

// Message content block
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

// Message in conversation
export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

// LLM response events for streaming
export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; toolCall: ToolCall }
  | { type: 'done'; stopReason: string };

// LLM provider interface
export interface LLMProvider {
  chat(
    messages: Message[],
    tools: ToolDefinition[],
    systemPrompt?: string
  ): AsyncGenerator<StreamEvent>;
}

// Provider configuration
export interface ProviderConfig {
  apiKey: string;
  model: string;
}
