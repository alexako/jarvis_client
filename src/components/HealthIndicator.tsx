import React from 'react';
import { ProviderHealth } from '../types';

interface HealthIndicatorProps {
  health: ProviderHealth;
}

export const HealthIndicator: React.FC<HealthIndicatorProps> = ({ health }) => {
  const getStatusText = () => {
    switch (health.status) {
      case 'healthy':
        return 'Online';
      case 'degraded':
        return 'Degraded';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="health">
      <div className={`health__dot health__dot--${health.status}`} />
      <span>{getStatusText()}</span>
      {health.responseTime && (
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          ({health.responseTime}ms)
        </span>
      )}
    </div>
  );
};