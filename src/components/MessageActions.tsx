import React, { useState } from 'react';
import { Copy, Share, Check } from 'lucide-react';

interface MessageActionsProps {
  content: string;
  messageId: string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({ content, messageId }) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Jarvis AI Response',
          text: content,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } else {
        // Fallback: copy to clipboard
        await handleCopy();
      }
    } catch (error) {
      console.error('Failed to share message:', error);
    }
  };

  return (
    <div className="message__actions">
      <button
        className="message__action-btn"
        onClick={handleCopy}
        title="Copy message"
        aria-label="Copy message"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <button
        className="message__action-btn"
        onClick={handleShare}
        title="Share message"
        aria-label="Share message"
      >
        <Share size={14} />
      </button>
    </div>
  );
};