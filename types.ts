
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface Settings {
  ollamaUrl: string;
  selectedModel: string;
  systemPrompt: string;
  temperature: number;
  triggerWord: string;
}