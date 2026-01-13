import type { Message, ContentBlock } from './llm/types.js';

export class Conversation {
  private messages: Message[] = [];

  addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
  }

  addAssistantMessage(content: string | ContentBlock[]): void {
    this.messages.push({ role: 'assistant', content });
  }

  addToolResult(toolUseId: string, result: string, isError: boolean = false): void {
    // Tool results need to be appended to the conversation
    this.messages.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: result,
        is_error: isError,
      }],
    });
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  getLength(): number {
    return this.messages.length;
  }
}
