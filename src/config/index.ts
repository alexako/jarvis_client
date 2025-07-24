// API Configuration
const isDevelopment = import.meta.env.DEV;

export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://192.168.5.154:8000',
    timeout: 30000,
    retryAttempts: 3,
    healthCheckInterval: 30000, // 30 seconds
  },
  app: {
    name: 'Jarvis Client',
    version: '1.0.0',
    debug: isDevelopment,
  },
  storage: {
    keys: {
      chatHistories: 'jarvis-chat-histories',
      currentChat: 'jarvis-current-chat',
      selectedProvider: 'jarvis-provider',
    },
  },
} as const;

// Environment-specific overrides
if (isDevelopment) {
  console.log('🔧 Development mode - API:', config.api.baseUrl);
}
