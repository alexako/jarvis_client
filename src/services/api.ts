import { AIProvider, ProviderHealth } from '../types';
import { config } from '../config';

export class JarvisAPI {
  private static logApiCall(endpoint: string, method: string, data?: any) {
    if (config.app.debug) {
      console.log(`🌐 API ${method} ${config.api.baseUrl}${endpoint}`, data || '');
    }
  }

  private static logApiResponse(endpoint: string, success: boolean, data?: any, error?: any) {
    if (config.app.debug) {
      if (success) {
        console.log(`✅ API Response ${endpoint}:`, data);
      } else {
        console.error(`❌ API Error ${endpoint}:`, error);
      }
    }
  }

  static async sendMessage(text: string, aiProvider: AIProvider): Promise<string> {
    const endpoint = '/chat';
    const requestData = { 
      text,
      "ai_provider": aiProvider,
      "use_tts": "false",
      "context": {}
    };

    this.logApiCall(endpoint, 'POST', requestData);

    try {
      const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: AbortSignal.timeout(config.api.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        this.logApiResponse(endpoint, false, null, error);
        throw error;
      }

      const data = await response.json();
      this.logApiResponse(endpoint, true, data);
      return data.response;
    } catch (error) {
      this.logApiResponse(endpoint, false, null, error);
      throw error;
    }
  }

  static async checkHealth(): Promise<ProviderHealth[]> {
    const endpoint = '/health';
    const startTime = Date.now();
    
    this.logApiCall(endpoint, 'GET');

    try {
      const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(config.api.timeout),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        console.warn(`⚠️ Health check failed: HTTP ${response.status}`);
        return this.getDefaultHealthStatus();
      }

      const data = await response.json();
      
      // Enhanced debugging for health response
      if (config.app.debug) {
        console.log('🔍 Raw health response:', data);
        console.log('🔍 data.components:', data.components);
      }
      
      const healthData = data.components || data;

      // Map API provider keys to our internal provider names
      const providerMapping: Record<string, AIProvider> = {
        'ai_provider_anthropic': 'anthropic',
        'ai_provider_deepseek': 'deepseek',
        'ai_provider_local': 'local'
      };

      // Add response time to health data
      const healthWithTiming: ProviderHealth[] = [];
      
      for (const [key, value] of Object.entries(healthData)) {
        const provider = providerMapping[key];
        if (provider) {
          const isHealthy = value === true || value === 'healthy' || value?.status === 'healthy';
          if (config.app.debug) {
            console.log(`🔍 Processing ${key} -> ${provider}: ${value} -> ${isHealthy ? 'healthy' : 'offline'}`);
          }
          healthWithTiming.push({
            provider,
            status: isHealthy ? 'healthy' : 'offline',
            lastChecked: new Date(),
            responseTime,
          });
        }
      }
      
      // Ensure we have all providers (add missing ones as offline)
      const allProviders: AIProvider[] = ['anthropic', 'deepseek', 'local'];
      for (const provider of allProviders) {
        if (!healthWithTiming.find(h => h.provider === provider)) {
          healthWithTiming.push({
            provider,
            status: 'offline',
            lastChecked: new Date(),
            responseTime,
          });
        }
      }
      this.logApiResponse(endpoint, true, healthWithTiming);
      return healthWithTiming;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn(`⏱️ Health check timeout after ${responseTime}ms`);
        } else if (error.message.includes('fetch')) {
          console.warn(`🔌 Cannot connect to API server at ${config.api.baseUrl}`);
        }
      }
      
      this.logApiResponse(endpoint, false, null, error);
      return this.getDefaultHealthStatus();
    }
  }

  private static getDefaultHealthStatus(): ProviderHealth[] {
    const defaultStatus: ProviderHealth[] = [
      {
        provider: 'anthropic',
        status: 'offline',
        lastChecked: new Date(),
      },
      {
        provider: 'deepseek',
        status: 'offline',
        lastChecked: new Date(),
      },
      {
        provider: 'local',
        status: 'offline',
        lastChecked: new Date(),
      },
    ];

    if (config.app.debug) {
      console.log('📴 Using default offline status for all providers');
    }

    return defaultStatus;
  }

  static getApiInfo() {
    return {
      baseUrl: config.api.baseUrl,
      timeout: config.api.timeout,
      healthCheckInterval: config.api.healthCheckInterval,
    };
  }
}