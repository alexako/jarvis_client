export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
  audioUrl?: string;
  streamUrl?: string;
  isAudioPlaying?: boolean;
  isAudioLoading?: boolean;
}

export interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AIProvider = 'anthropic' | 'deepseek' | 'local';

export interface ProviderHealth {
  provider: AIProvider;
  status: 'healthy' | 'degraded' | 'offline';
  lastChecked: Date;
  responseTime?: number;
}

export interface AppSettings {
  selectedProvider: AIProvider;
  darkMode: boolean;
  autoSave: boolean;
}