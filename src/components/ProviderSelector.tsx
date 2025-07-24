import React from 'react';
import { AIProvider, ProviderHealth } from '../types';

interface ProviderSelectorProps {
  selectedProvider: AIProvider;
  providerHealth: ProviderHealth[];
  onProviderChange: (provider: AIProvider) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
}) => {

  return (
    <div className="provider">
      <select
        className="provider__dropdown"
        value={selectedProvider}
        onChange={(e) => onProviderChange(e.target.value as AIProvider)}
      >
        <option value="anthropic">Anthropic Claude</option>
        <option value="deepseek">DeepSeek</option>
        <option value="local">Local Llama</option>
      </select>
    </div>
  );
};