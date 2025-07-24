import React from 'react';
import { Message } from '../types';
import { MessageActions } from './MessageActions';
import { format, isValid } from 'date-fns';
import { Check, Clock, AlertCircle } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const formatMessageTime = (timestamp: Date | string | number): string => {
  try {
    const dateObj = new Date(timestamp);
    if (!isValid(dateObj)) {
      return '--:--';
    }
    return format(dateObj, 'HH:mm');
  } catch (error) {
    console.warn('Failed to format message timestamp:', timestamp, error);
    return '--:--';
  }
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // Debug logging for message rendering
  if (typeof window !== 'undefined' && (window as any).config?.app?.debug) {
    console.log('🎨 Rendering ChatMessage:', {
      id: message.id,
      role: message.role,
      content: message.content.substring(0, 50) + '...',
      timestamp: message.timestamp,
      status: message.status
    });
  }

  try {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <div className="message__status-spinner" />;
      case 'sent':
      case 'delivered':
        return <Check size={12} className="message__status-icon message__status-icon--success" />;
      case 'error':
        return <AlertCircle size={12} className="message__status-icon message__status-icon--error" />;
      default:
        return null;
    }
  };

  return (
    <div className={`message message--${message.role} ${message.status ? `message--${message.status}` : ''}`}>
      <div className="message__bubble">
        <div className="message__content">{message.content}</div>
        <div className="message__footer">
          <div className="message__timestamp">
            {getStatusIcon()}
            {formatMessageTime(message.timestamp)}
          </div>
        </div>
      </div>
      {message.role === 'assistant' && message.status !== 'sending' && (
        <MessageActions content={message.content} messageId={message.id} />
      )}
    </div>
  );
  
  } catch (error) {
    console.error('🚨 ChatMessage render error:', error, 'Message:', message);
    return (
      <div className="message message--error">
        <div className="message__bubble">
          <div className="message__content">Error rendering message: {message.id}</div>
        </div>
      </div>
    );
  }
};