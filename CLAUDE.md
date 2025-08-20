# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jarvis Client is a Progressive Web App (PWA) built with React, TypeScript, and Vite that provides a chat interface for interacting with multiple AI providers (Anthropic, DeepSeek, Local). The application features a simplified chat architecture with local storage for chat histories and real-time provider health monitoring.

## Development Commands

```bash
# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# TypeScript type checking
npm run typecheck
```

## Architecture Overview

### Core State Management
- **`useChat` Hook** (`src/hooks/useChat.ts`): Manages active chat state with simplified message handling
- **`useLocalStorage` Hook** (`src/hooks/useLocalStorage.ts`): Handles persistent storage for chat histories, settings, and current chat
- **Local Storage Keys**: Defined in `src/config/index.ts` under `storage.keys`

### Chat Flow Architecture
1. **App.tsx**: Main orchestrator handling chat creation, provider selection, and state synchronization
2. **ChatView Component**: Unified chronological message display 
3. **JarvisAPI Service**: Handles all API communication with health checks and provider management
4. **Message Status Flow**: sending → sent → delivered (or error)

### Key Components
- **Sidebar**: Chat history management with private/regular chat support
- **ProviderSelector**: AI provider switching with health indicators
- **ChatInput**: Message composition with loading states
- **HealthIndicator**: Real-time API health monitoring

## API Configuration

Environment variables in `.env`:
```
VITE_API_BASE_URL=http://localhost:8000    # Jarvis API server URL
VITE_API_KEY=your-api-key-here             # API authentication
VITE_HOST_HEADER=alexako.com               # Production host header
```

Default API endpoints expected by the client:
- `/chat` - Send messages to AI providers
- `/health` - Provider health status
- `/providers` - Available AI providers
- `/` - Server info and version

## PWA Configuration

- **Service Worker**: Auto-updating with Workbox
- **Manifest**: Defined in `vite.config.ts` for standalone app experience
- **Caching**: Network-first strategy for API calls, cache-first for assets

## Data Models

### Message Interface
```typescript
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
}
```

### ChatHistory Interface
```typescript
interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Local Storage Structure

- `jarvis-chat-histories`: Array of ChatHistory objects
- `jarvis-current-chat`: Current active chat ID
- `jarvis-provider`: Selected AI provider ('anthropic' | 'deepseek' | 'local')

## Error Handling Patterns

- API errors display user-friendly messages in chat
- Provider health monitoring with automatic fallback status
- Timeout handling (30s default) with retry logic
- Console debugging in development mode via `config.app.debug`

## State Synchronization

The app maintains dual state management:
1. **Active Chat State**: Real-time message updates via `useChat`
2. **Persistent Storage**: Chat histories saved to localStorage on every message

This dual approach ensures both responsive UI updates and data persistence without complex state management libraries.