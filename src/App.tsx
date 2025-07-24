import { useState, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ProviderSelector } from './components/ProviderSelector';
import { HealthIndicator } from './components/HealthIndicator';
import { Sidebar } from './components/Sidebar';
import { useLocalStorage } from './hooks/useLocalStorage';
import { JarvisAPI } from './services/api';
import { config } from './config';
import { Message, ChatHistory, AIProvider, ProviderHealth } from './types';
import './styles/globals.scss';

function App() {
  const [chatHistories, setChatHistories] = useLocalStorage<ChatHistory[]>(config.storage.keys.chatHistories, []);
  const [currentChatId, setCurrentChatId] = useLocalStorage<string | null>(config.storage.keys.currentChat, null);
  const [selectedProvider, setSelectedProvider] = useLocalStorage<AIProvider>(config.storage.keys.selectedProvider, 'anthropic');
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 992);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chatHistories.find(chat => chat.id === currentChatId);
  const currentProviderHealth = providerHealth.find(health => health.provider === selectedProvider);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  useEffect(() => {
    const checkHealth = async () => {
      if (config.app.debug) {
        console.log('🔍 Checking API health...');
      }
      
      const health = await JarvisAPI.checkHealth();
      setProviderHealth(health);
      
      if (config.app.debug) {
        console.log('💊 Health status updated:', health);
      }
    };

    // Log initial API configuration
    if (config.app.debug) {
      console.log('🚀 Jarvis Client starting...', {
        api: JarvisAPI.getApiInfo(),
        selectedProvider,
        chatCount: chatHistories.length,
      });
    }

    checkHealth();
    const interval = setInterval(checkHealth, config.api.healthCheckInterval);

    return () => clearInterval(interval);
  }, [selectedProvider, chatHistories.length]);

  useEffect(() => {
    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 992;
      setIsDesktop(newIsDesktop);
      if (newIsDesktop) {
        setSidebarOpen(true); // Keep sidebar open on desktop
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial state

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const generateChatTitle = (firstMessage: string): string => {
    return firstMessage.length > 30 
      ? firstMessage.substring(0, 30) + '...'
      : firstMessage;
  };

  const createNewChat = (isPrivate: boolean = false) => {
    const newChat: ChatHistory = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      isPrivate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setChatHistories((prev: ChatHistory[]) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setSidebarOpen(false);
  };

  const deleteChat = (chatId: string) => {
    setChatHistories((prev: ChatHistory[]) => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentChatId) {
      if (config.app.debug) {
        console.log('📝 Creating new chat for message:', content.substring(0, 50) + '...');
      }
      createNewChat();
      return;
    }

    if (config.app.debug) {
      console.log(`💬 Sending message to ${selectedProvider}:`, content.substring(0, 100) + '...');
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      status: 'sending',
    };

    // Add user message
    setChatHistories((prev: ChatHistory[]) => prev.map((chat: ChatHistory) => {
      if (chat.id === currentChatId) {
        const updatedChat = {
          ...chat,
          title: chat.messages.length === 0 ? generateChatTitle(content) : chat.title,
          messages: [...chat.messages, userMessage],
          updatedAt: new Date(),
        };
        return updatedChat;
      }
      return chat;
    }));

    setIsLoading(true);

    try {
      // Update user message status to 'sent'
      setChatHistories((prev: ChatHistory[]) => prev.map((chat: ChatHistory) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: chat.messages.map(msg => 
              msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
            ),
          };
        }
        return chat;
      }));

      const response = await JarvisAPI.sendMessage(content, selectedProvider);
      
      if (config.app.debug) {
        console.log('🤖 Received response:', response.substring(0, 100) + '...');
      }

      // Update user message status to 'delivered'
      setChatHistories((prev: ChatHistory[]) => prev.map((chat: ChatHistory) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: chat.messages.map(msg => 
              msg.id === userMessage.id ? { ...msg, status: 'delivered' } : msg
            ),
          };
        }
        return chat;
      }));
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        status: 'delivered',
      };

      setChatHistories((prev: ChatHistory[]) => prev.map((chat: ChatHistory) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, assistantMessage],
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
    } catch (error) {
      if (config.app.debug) {
        console.error('🚨 Message send failed:', error);
      }

      // Update user message status to 'error'
      setChatHistories((prev: ChatHistory[]) => prev.map((chat: ChatHistory) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: chat.messages.map(msg => 
              msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
            ),
          };
        }
        return chat;
      }));

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please check the console for details and ensure the API server is running.',
        role: 'assistant',
        timestamp: new Date(),
        status: 'error',
      };

      setChatHistories((prev: ChatHistory[]) => prev.map((chat: ChatHistory) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, errorMessage],
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat">
      {/* Sidebar overlay for mobile */}
      <div 
        className={`sidebar__overlay ${sidebarOpen && !isDesktop ? 'sidebar__overlay--visible' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          setSidebarOpen(false);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          setSidebarOpen(false);
        }}
      />
      
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chatHistories={chatHistories}
        currentChatId={currentChatId || undefined}
        onSelectChat={setCurrentChatId}
        onNewChat={() => createNewChat(false)}
        onNewPrivateChat={() => createNewChat(true)}
        onDeleteChat={deleteChat}
      />
      
      <div className="chat__main">
        <div className="header">
          <div className="header__left">
            {!isDesktop && (
              <button 
                className="btn btn--menu" 
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
            )}
            <h1 className="header__title">
              {currentChat?.title || 'Jarvis'}
            </h1>
          </div>
          
          <div className="header__right">
            <ProviderSelector
              selectedProvider={selectedProvider}
              providerHealth={providerHealth}
              onProviderChange={setSelectedProvider}
            />
            <HealthIndicator 
              health={currentProviderHealth || {
                provider: selectedProvider,
                status: 'offline',
                lastChecked: new Date(),
              }} 
            />
          </div>
        </div>

        <div className="messages">
          {currentChat?.messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="message message--assistant message--loading">
              <div className="message__bubble">
                <div className="spinner" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSendMessage={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}

export default App;