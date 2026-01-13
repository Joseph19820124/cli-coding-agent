import OpenAI from 'openai';
import type {
  LLMProvider,
  Message,
  ToolDefinition,
  StreamEvent,
  ProviderConfig,
} from './types.js';

export class OpenRouterProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/cli-agent',
        'X-Title': 'CLI Coding Agent',
      },
    });
    this.model = config.model;
  }

  async *chat(
    messages: Message[],
    tools: ToolDefinition[],
    systemPrompt?: string
  ): AsyncGenerator<StreamEvent> {
    // Convert tools to OpenAI format
    const openaiTools: OpenAI.ChatCompletionTool[] = tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    // Build messages array with system prompt
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt });
    }

    // Convert messages to OpenAI format
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        openaiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      } else {
        // Handle content blocks - need to convert tool results
        for (const block of msg.content) {
          if (block.type === 'text') {
            openaiMessages.push({
              role: msg.role,
              content: block.text,
            });
          } else if (block.type === 'tool_use') {
            openaiMessages.push({
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: block.id,
                type: 'function',
                function: {
                  name: block.name,
                  arguments: JSON.stringify(block.input),
                },
              }],
            });
          } else if (block.type === 'tool_result') {
            openaiMessages.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: block.content,
            });
          }
        }
      }
    }

    // Create streaming request
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      stream: true,
    });

    const toolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;

      if (delta?.content) {
        yield { type: 'text', text: delta.content };
      }

      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const index = toolCall.index;
          if (!toolCalls.has(index)) {
            toolCalls.set(index, { id: '', name: '', arguments: '' });
          }
          const tc = toolCalls.get(index)!;
          if (toolCall.id) tc.id = toolCall.id;
          if (toolCall.function?.name) tc.name = toolCall.function.name;
          if (toolCall.function?.arguments) tc.arguments += toolCall.function.arguments;
        }
      }

      if (finishReason) {
        // Emit all accumulated tool calls
        for (const tc of toolCalls.values()) {
          if (tc.id && tc.name) {
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = JSON.parse(tc.arguments || '{}');
            } catch {
              // Empty or invalid JSON
            }
            yield {
              type: 'tool_call',
              toolCall: {
                id: tc.id,
                name: tc.name,
                arguments: parsedArgs,
              },
            };
          }
        }
        yield { type: 'done', stopReason: finishReason };
      }
    }
  }
}
