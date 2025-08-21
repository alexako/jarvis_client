// API Configuration
const isDevelopment = import.meta.env.DEV;

export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    apiKey: import.meta.env.VITE_API_KEY || 'fixed-dev-api-key',
    hostHeader: import.meta.env.VITE_HOST_HEADER || 'alexako.com',
    timeout: 30000,
    retryAttempts: 3,
    healthCheckInterval: 30000, // 30 seconds
  },
  app: {
    name: 'Jarvis Client',
    version: '1.3.0',
    debug: isDevelopment,
  },
  compatibility: {
    server: {
      minVersion: '1.4.0',
      maxVersion: '1.9.99', // Support through 1.x major version
      requiredEndpoints: ['/health', '/chat', '/providers', '/status'],
    },
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
