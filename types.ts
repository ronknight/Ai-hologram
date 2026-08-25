
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

/** Which scene is rendered behind the hologram. See components/backdropPresets.ts. */
export type BackdropTheme =
  | 'nature'
  | 'city'
  | 'sunset'
  | 'dawn'
  | 'night'
  | 'studio'
  | 'space'
  | 'futuristic';

export interface Settings {
  ollamaUrl: string;
  selectedModel: string;
  systemPrompt: string;
  temperature: number;
  triggerWord: string;
  backdropTheme: BackdropTheme;
  hologramModel: string;
}