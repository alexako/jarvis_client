import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, VolumeX } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string, useTts?: boolean, streamAudio?: boolean) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [useTts, setUseTts] = useState(false);
  const [streamAudio, setStreamAudio] = useState(true); // Default to streaming for better UX
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), useTts, streamAudio);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="chat-input">
      <div className="chat-input__controls">
        <button
          type="button"
          className={`chat-input__control-btn ${useTts ? 'chat-input__control-btn--active' : ''}`}
          onClick={() => setUseTts(!useTts)}
          title={useTts ? 'Disable audio response' : 'Enable audio response'}
        >
          {useTts ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {useTts && streamAudio && <span className="chat-input__streaming-badge">stream</span>}
        </button>
        {useTts && (
          <button
            type="button"
            className={`chat-input__control-btn chat-input__control-btn--small ${streamAudio ? 'chat-input__control-btn--active' : ''}`}
            onClick={() => setStreamAudio(!streamAudio)}
            title={streamAudio ? 'Use file-based audio' : 'Use streaming audio'}
          >
            {streamAudio ? 'S' : 'F'}
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="chat-input__container">
        <textarea
          ref={textareaRef}
          className="chat-input__field"
          placeholder="Message Jarvis..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        <button
          type="submit"
          className="chat-input__send-btn"
          disabled={!message.trim() || disabled}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};