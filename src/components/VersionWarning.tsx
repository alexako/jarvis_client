import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { CompatibilityResult } from '../utils/version';

interface VersionWarningProps {
  compatibility: CompatibilityResult;
  onDismiss?: () => void;
  showOnlyErrors?: boolean;
}

export const VersionWarning: React.FC<VersionWarningProps> = ({ 
  compatibility, 
  onDismiss,
  showOnlyErrors = false 
}) => {
  // Don't show if compatible and only showing errors
  if (compatibility.compatible && showOnlyErrors) {
    return null;
  }

  const isError = !compatibility.compatible;
  const warningClass = isError ? 'version-warning--error' : 'version-warning--success';

  return (
    <div className={`version-warning ${warningClass}`}>
      <div className="version-warning__content">
        <div className="version-warning__icon">
          {isError ? (
            <AlertTriangle size={20} />
          ) : (
            <span className="version-warning__checkmark">✓</span>
          )}
        </div>
        
        <div className="version-warning__details">
          <div className="version-warning__title">
            {isError ? 'Version Compatibility Warning' : 'Version Compatible'}
          </div>
          
          <div className="version-warning__versions">
            Client: v{compatibility.clientVersion}
            {compatibility.serverVersion && ` | Server: v${compatibility.serverVersion}`}
          </div>
          
          {isError && compatibility.issues.length > 0 && (
            <div className="version-warning__issues">
              {compatibility.issues.map((issue, index) => (
                <div key={index} className="version-warning__issue">
                  • {issue}
                </div>
              ))}
            </div>
          )}
          
          {isError && (
            <div className="version-warning__recommendation">
              Please update your Jarvis server to v1.4.0 or later for full compatibility.
            </div>
          )}
        </div>
        
        {onDismiss && (
          <button 
            className="version-warning__close"
            onClick={onDismiss}
            aria-label="Dismiss version warning"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};