import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { ChatView } from './components/ChatView';
import { ChatInput } from './components/ChatInput';
import { ProviderSelector } from './components/ProviderSelector';
import { HealthIndicator } from './components/HealthIndicator';
import { Sidebar } from './components/Sidebar';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useChat } from './hooks/useChat';
import { JarvisAPI } from './services/api';
import { config } from './config';
import { Message, ChatHistory, AIProvider, ProviderHealth } from './types';
import './styles/globals.scss';

function App() {
  const [chatHistories, setChatHistories] = useLocalStorage<ChatHistory[]>(config.storage.keys.chatHistories, []);
  const [currentChatId, setCurrentChatId] = useLocalStorage<string | null>(config.storage.keys.currentChat, null);
  const [selectedProvider, setSelectedProvider] = useLocalStorage<AIProvider>(config.storage.keys.selectedProvider, 'anthropic');
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 992);
  
  const { chatState, addMessage, updateMessage, setLoading, clearMessages, loadMessages } = useChat();

  const currentChat = chatHistories.find(chat => chat.id === currentChatId);
  const currentProviderHealth = providerHealth.find(health => health.provider === selectedProvider);

  // Load messages when chat changes
  useEffect(() => {
    if (currentChat?.messages) {
      loadMessages(currentChat.messages);
    } else {
      clearMessages();
    }
  }, [currentChatId, currentChat?.messages, loadMessages, clearMessages]);

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
      activeChatId = Date.now().toString();
      setCurrentChatId(activeChatId);
      setSidebarOpen(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      status: 'sending',
    };

    // Add user message to local chat state
    addMessage(userMessage);

    // Update chat histories for persistence
    setChatHistories((prev: ChatHistory[]) => {
      let workingArray = prev;
      if (!prev.find(c => c.id === activeChatId)) {
        const newChat: ChatHistory = {
          id: activeChatId,
          title: generateChatTitle(content),
          messages: [],
          isPrivate: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        workingArray = [newChat, ...prev];
      }
      
      return workingArray.map((chat: ChatHistory) => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            title: chat.messages.length === 0 ? generateChatTitle(content) : chat.title,
            messages: [...chat.messages, userMessage],
            updatedAt: new Date(),
          };
        }
        return chat;
      });
    });

    setLoading(true);

    try {
      // Update user message status
      updateMessage(userMessage.id, { status: 'sent' });
      
      // Update in chat histories as well
      setChatHistories((prev: ChatHistory[]) => prev.map((chat: ChatHistory) => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: chat.messages.map(msg => 
              msg.id === userMessage.id ? { ...msg, status: 'sent' as const } : msg
            ),
          };
        }
        return chat;
      }));

      const response = await JarvisAPI.sendMessage(content, selectedProvider);
      
      // Update user message to delivered
      updateMessage(userMessage.id, { status: 'delivered' });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        status: 'delivered',
      };

      // Add assistant message to local chat state
      addMessage(assistantMessage);

      // Update chat histories
      setChatHistories((prev: ChatHistory[]) => prev.map((chat: ChatHistory) => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: chat.messages.map(msg => 
              msg.id === userMessage.id ? { ...msg, status: 'delivered' as const } : msg
            ).concat(assistantMessage),
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
    } catch (error) {
      // Update user message to error
      updateMessage(userMessage.id, { status: 'error' });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please check the console for details and ensure the API server is running.',
        role: 'assistant',
        timestamp: new Date(),
        status: 'error',
      };

      // Add error message to local chat state
      addMessage(errorMessage);

      // Update chat histories
      setChatHistories((prev: ChatHistory[]) => prev.map((chat: ChatHistory) => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: chat.messages.map(msg => 
              msg.id === userMessage.id ? { ...msg, status: 'error' as const } : msg
            ).concat(errorMessage),
            updatedAt: new Date(),
          };
        }
        return chat;
      }));
    } finally {
      setLoading(false);
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

        <ChatView 
          messages={chatState.messages} 
          isLoading={chatState.isLoading} 
        />

        <ChatInput onSendMessage={sendMessage} disabled={chatState.isLoading} />
      </div>
    </div>
  );
}

export default App;