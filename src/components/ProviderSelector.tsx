import React, { useEffect, useState } from 'react';
import { AIProvider, ProviderHealth } from '../types';
import { JarvisAPI } from '../services/api';

interface ProviderSelectorProps {
  selectedProvider: AIProvider;
  providerHealth: ProviderHealth[];
  onProviderChange: (provider: AIProvider) => void;
}

interface ProviderInfo {
  name: string;
  healthy: boolean;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
}) => {
  const [providers, setProviders] = useState<{[key: string]: ProviderInfo}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providersData = await JarvisAPI.getProviders();
        setProviders(providersData);
      } catch (error) {
        console.error('Failed to load providers:', error);
        // Fallback to default providers
        setProviders({
          anthropic: { name: "Anthropic Claude", healthy: false },
          deepseek: { name: "DeepSeek", healthy: false },
          local: { name: "Local AI", healthy: false }
        });
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  if (loading) {
    return (
      <div className="provider">
        <select className="provider__dropdown" disabled>
          <option>Loading providers...</option>
        </select>
      </div>
    );
  }

  return (
    <div className="provider">
      <select
        className="provider__dropdown"
        value={selectedProvider}
        onChange={(e) => onProviderChange(e.target.value as AIProvider)}
      >
        {Object.entries(providers).map(([key, provider]) => (
          <option key={key} value={key}>
            {provider.name}
          </option>
        ))}
      </select>
    </div>
  );
};