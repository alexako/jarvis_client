import React from 'react';
import { ChatHistory } from '../types';
import { X, Plus, Trash2, Lock } from 'lucide-react';
import { format, isValid } from 'date-fns';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistories: ChatHistory[];
  currentChatId?: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onNewPrivateChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

const formatChatDate = (date: Date | string | number): string => {
  try {
    const dateObj = new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    return format(dateObj, 'MMM d, HH:mm');
  } catch (error) {
    console.warn('Failed to format date:', date, error);
    return 'Unknown date';
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  chatHistories,
  currentChatId,
  onSelectChat,
  onNewChat,
  onNewPrivateChat,
  onDeleteChat,
}) => {
  return (
    <div className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar__header">
        <h2>Chat History</h2>
        <button 
          className="btn btn--menu btn--close" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="sidebar__content">
        <button className="btn btn--new-chat" onClick={onNewChat}>
          <Plus size={16} style={{ marginRight: '0.5rem' }} />
          New Chat
        </button>
        
        <button className="btn btn--new-chat" onClick={onNewPrivateChat}>
          <Lock size={16} style={{ marginRight: '0.5rem' }} />
          New Private Chat
        </button>
        
        <div className="chat-list">
          {chatHistories.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${chat.id === currentChatId ? 'chat-item--active' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="chat-item__title">
                  {chat.isPrivate && <Lock size={12} style={{ marginRight: '0.25rem', display: 'inline' }} />}
                  {chat.title}
                </div>
                <div className="chat-item__meta">
                  {formatChatDate(chat.updatedAt)} • {chat.messages.length} messages
                </div>
              </div>
              <button
                className="btn btn--delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};