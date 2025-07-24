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

  // Debug current chat state
  useEffect(() => {
    if (config.app.debug) {
      console.log('🔍 Chat state changed:');
      console.log('  currentChatId:', currentChatId);
      console.log('  currentChat:', currentChat);
      console.log('  currentChat messages:', currentChat?.messages?.length || 0);
      if (currentChat?.messages?.length) {
        console.log('  latest message:', currentChat.messages[currentChat.messages.length - 1]);
      }
    }
  }, [currentChat?.messages?.length, currentChatId]);

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
    let activeChatId = currentChatId;
    
    if (!activeChatId) {
      if (config.app.debug) {
        console.log('📝 Creating new chat for message:', content.substring(0, 50) + '...');
      }
      const newChatId = Date.now().toString();
      const newChat: ChatHistory = {
        id: newChatId,
        title: 'New Chat',
        messages: [],
        isPrivate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setChatHistories((prev: ChatHistory[]) => [newChat, ...prev]);
      setCurrentChatId(newChatId);
      setSidebarOpen(false);
      activeChatId = newChatId;
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
    setChatHistories((prev: ChatHistory[]) => {
      if (config.app.debug) {
        console.log('🔍 Before adding user message:');
        console.log('  activeChatId:', activeChatId);
        console.log('  chatHistories length:', prev.length);
        console.log('  current chat exists:', prev.find(c => c.id === activeChatId) ? 'YES' : 'NO');
        console.log('  userMessage:', userMessage);
      }
      
      const updated = prev.map((chat: ChatHistory) => {
        if (chat.id === activeChatId) {
          const updatedChat = {
            ...chat,
            title: chat.messages.length === 0 ? generateChatTitle(content) : chat.title,
            messages: [...chat.messages, userMessage],
            updatedAt: new Date(),
          };
          
          if (config.app.debug) {
            console.log('🔍 Updated chat:', updatedChat);
            console.log('  messages count:', updatedChat.messages.length);
          }
          
          return updatedChat;
        }
        return chat;
      });
      
      if (config.app.debug) {
        console.log('🔍 After updating chat histories:', updated.length);
        const targetChat = updated.find(c => c.id === activeChatId);
        console.log('🔍 Target chat messages:', targetChat?.messages.length);
      }
      
      return updated;
    });

    setIsLoading(true);

    try {
      // Update user message status to 'sent'
      setChatHistories((prev: ChatHistory[]) => prev.map((chat: ChatHistory) => {
        if (chat.id === activeChatId) {
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
        if (chat.id === activeChatId) {
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
        if (chat.id === activeChatId) {
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
        if (chat.id === activeChatId) {
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
        if (chat.id === activeChatId) {
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
          {config.app.debug && (
            <div style={{fontSize: '12px', color: '#666', marginBottom: '1rem'}}>
              Debug: currentChatId={currentChatId}, currentChat exists={currentChat ? 'YES' : 'NO'}, 
              messages count={currentChat?.messages.length || 0}
              {currentChat?.messages && (
                <div>
                  Last 3 message IDs: {currentChat.messages.slice(-3).map(m => `${m.role}:${m.id.slice(-4)}`).join(', ')}
                </div>
              )}
            </div>
          )}
          {currentChat?.messages.map((message, index) => {
            if (config.app.debug && index >= (currentChat.messages.length - 3)) {
              console.log(`🔍 Rendering message ${index}:`, message);
            }
            
            // Check for duplicate IDs
            if (config.app.debug) {
              const duplicates = currentChat.messages.filter(m => m.id === message.id);
              if (duplicates.length > 1) {
                console.warn('🚨 Duplicate message ID found:', message.id, 'Count:', duplicates.length);
              }
            }
            
            return <ChatMessage key={message.id} message={message} />;
          })}
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