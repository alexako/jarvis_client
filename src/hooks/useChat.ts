import { useState, useCallback } from 'react';
import { Message } from '../types';

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export const useChat = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
  });

  const addMessage = useCallback((message: Message) => {
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setChatState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setChatState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setChatState({
      messages: [],
      isLoading: false,
    });
  }, []);

  const loadMessages = useCallback((messages: Message[]) => {
    setChatState(prev => ({
      ...prev,
      messages,
    }));
  }, []);

  return {
    chatState,
    addMessage,
    updateMessage,
    setLoading,
    clearMessages,
    loadMessages,
  };
};