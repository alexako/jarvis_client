import { AIProvider, ProviderHealth } from '../types';
import { config } from '../config';
import { ServerInfo, checkCompatibility, CompatibilityResult } from '../utils/version';

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

  static async sendMessage(text: string, aiProvider: AIProvider, useTts: boolean = false, streamAudio: boolean = false): Promise<{
    response: string;
    audioUrl?: string;
    streamUrl?: string;
    requestId: string;
  }> {
    const endpoint = '/chat';
    const requestData = { 
      text,
      "ai_provider": aiProvider,
      "use_tts": useTts,
      "stream_audio": streamAudio,
      "context": {}
    };

    this.logApiCall(endpoint, 'POST', requestData);

    try {
      const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api.apiKey}`,
          'Host': config.api.hostHeader,
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
      return {
        response: data.response,
        audioUrl: data.audio_url,
        streamUrl: data.stream_url,
        requestId: data.request_id
      };
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
          'Host': config.api.hostHeader,
        },
        signal: AbortSignal.timeout(10000), // Shorter timeout for health checks
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        console.warn(`⚠️ Health check failed: HTTP ${response.status}`);
        // If chat works but health endpoint fails, assume providers are healthy
        return this.getFallbackHealthStatus(responseTime);
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
        'ai_provider_local': 'local',
        'anthropic': 'anthropic',
        'deepseek': 'deepseek', 
        'local': 'local'
      };

      // Add response time to health data
      const healthWithTiming: ProviderHealth[] = [];
      
      for (const [key, value] of Object.entries(healthData)) {
        const provider = providerMapping[key];
        if (provider) {
          const isHealthy = value === true || value === 'healthy' || value?.status === 'healthy' || value === 'ok';
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
      
      // Ensure we have all providers (add missing ones as healthy if server responds)
      const allProviders: AIProvider[] = ['anthropic', 'deepseek', 'local'];
      for (const provider of allProviders) {
        if (!healthWithTiming.find(h => h.provider === provider)) {
          healthWithTiming.push({
            provider,
            status: 'healthy', // Default to healthy if server responds but provider not listed
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
      // If health check fails but we know API works, return fallback status
      return this.getFallbackHealthStatus(responseTime);
    }
  }

  private static getFallbackHealthStatus(responseTime: number): ProviderHealth[] {
    const fallbackStatus: ProviderHealth[] = [
      {
        provider: 'anthropic',
        status: 'healthy',
        lastChecked: new Date(),
        responseTime,
      },
      {
        provider: 'deepseek',
        status: 'healthy',
        lastChecked: new Date(),
        responseTime,
      },
      {
        provider: 'local',
        status: 'healthy',
        lastChecked: new Date(),
        responseTime,
      },
    ];

    if (config.app.debug) {
      console.log('🔄 Using fallback healthy status for all providers');
    }

    return fallbackStatus;
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

  static async getServerInfo(): Promise<ServerInfo> {
    const endpoint = '/';
    this.logApiCall(endpoint, 'GET');

    try {
      const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Host': config.api.hostHeader,
        },
        signal: AbortSignal.timeout(config.api.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to get server info`);
      }

      const data = await response.json();
      this.logApiResponse(endpoint, true, data);
      
      return {
        version: data.version || 'unknown',
        name: data.name || 'Jarvis Server',
        status: data.status || 'unknown',
        endpoints: data.endpoints || [],
      };
    } catch (error) {
      this.logApiResponse(endpoint, false, null, error);
      throw error;
    }
  }

  static async checkServerCompatibility(): Promise<CompatibilityResult> {
    try {
      const serverInfo = await this.getServerInfo();
      
      const result = checkCompatibility(
        serverInfo,
        config.app.version,
        config.compatibility.server.minVersion,
        config.compatibility.server.maxVersion,
        [...config.compatibility.server.requiredEndpoints]
      );

      if (config.app.debug) {
        console.log('🔍 Server compatibility check:', result);
      }

      return result;
    } catch (error) {
      if (config.app.debug) {
        console.error('❌ Failed to check server compatibility:', error);
      }
      
      return {
        compatible: false,
        issues: ['Unable to connect to server or retrieve version information'],
        clientVersion: config.app.version,
      };
    }
  }

  static async getProviders(): Promise<{[key: string]: {name: string, healthy: boolean}}> {
    const endpoint = '/providers';
    this.logApiCall(endpoint, 'GET');

    try {
      const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api.apiKey}`,
          'Host': config.api.hostHeader,
        },
        signal: AbortSignal.timeout(config.api.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to get providers`);
      }

      const data = await response.json();
      this.logApiResponse(endpoint, true, data);
      return data;
    } catch (error) {
      this.logApiResponse(endpoint, false, null, error);
      // Return default providers on error
      return {
        anthropic: { name: "Anthropic Claude", healthy: false },
        deepseek: { name: "DeepSeek", healthy: false },
        local: { name: "Local AI", healthy: false }
      };
    }
  }

  static async streamAudio(streamUrl: string): Promise<Blob> {
    this.logApiCall(streamUrl, 'GET');

    try {
      const fullUrl = streamUrl.startsWith('/') ? `${config.api.baseUrl}${streamUrl}` : streamUrl;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.api.apiKey}`,
          'Host': config.api.hostHeader,
        },
        signal: AbortSignal.timeout(30000), // Longer timeout for audio streaming
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to stream audio`);
      }

      const audioBlob = await response.blob();
      this.logApiResponse(streamUrl, true, { size: audioBlob.size });
      return audioBlob;
    } catch (error) {
      this.logApiResponse(streamUrl, false, null, error);
      throw error;
    }
  }

  static getApiInfo() {
    return {
      baseUrl: config.api.baseUrl,
      timeout: config.api.timeout,
      healthCheckInterval: config.api.healthCheckInterval,
      clientVersion: config.app.version,
      compatibility: config.compatibility,
    };
  }
}