export interface Message {
  content: string;
  role: 'user' | 'assistant' | 'model_preview';
}

export interface InitialData {
  connectedToPosbus: boolean;
  hasOpenAIKey: boolean;
  challenge?: string;
  conversation: Message[];
}
