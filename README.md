# 🤖 Jarvis Client

> *"Sometimes you gotta run before you can walk."* - Tony Stark

A sleek, modern Progressive Web App (PWA) client for your very own Jarvis AI Assistant. Built with React, TypeScript, and a whole lot of ✨ *magic* ✨.

## 🚀 Features

- **💬 Real-time Chat**: Talk to Jarvis like you're chatting with a friend (who happens to be artificially intelligent)
- **🔄 Multiple AI Providers**: Switch between Anthropic, DeepSeek, and local models on the fly
- **📱 Progressive Web App**: Install it on your phone, tablet, or desktop - works everywhere!
- **🎨 Beautiful UI**: Clean, modern interface with smooth animations and delightful interactions
- **💾 Chat History**: Never lose a conversation - all your chats are saved locally
- **🌙 Dark Mode**: Easy on the eyes, because we're not monsters
- **⚡ Lightning Fast**: Optimized performance with simplified state management
- **🔒 Privacy First**: All data stays on your device (unless you're using cloud providers, obviously)

## 🛠️ Tech Stack

- **React 18** with TypeScript
- **Vite** for blazingly fast development
- **SCSS** for styling that doesn't make you cry
- **Lucide React** for beautiful icons
- **PWA** capabilities with Workbox
- **Date-fns** for handling time like a boss

## 🎯 Getting Started

### Prerequisites

- Node.js (because JavaScript needs to JavaScript)
- npm or yarn (pick your poison)
- A sense of humor (optional but recommended)

### Installation

```bash
# Clone this beauty
git clone git@github.com:alexako/jarvis_client.git
cd jarvis-client

# Install dependencies (grab a coffee, this might take a moment)
npm install

# Fire up the development server
npm run dev

# Open your browser to http://localhost:3000 and witness the magic ✨
```

### Building for Production

```bash
# Create an optimized build
npm run build

# Preview the production build
npm run preview
```

## 🎮 Usage

1. **Start Chatting**: Type your message and hit send (or press Enter, we're not picky)
2. **Switch Providers**: Use the dropdown to choose your AI provider
3. **Browse History**: Check the sidebar for your previous conversations
4. **Copy & Share**: Use the handy buttons to copy or share responses
5. **Install as App**: Click the "Install" prompt to add it to your home screen

## 🏗️ Architecture

This project features a beautifully simplified chat architecture:

- **`useChat` Hook**: Streamlined state management for active conversations
- **`ChatView` Component**: Unified rendering for chronological message display
- **Simplified App Logic**: Reduced from 400+ lines to ~100 lines of focused code
- **Clean Separation**: Chat logic and UI concerns are properly separated

## 🎨 UI Highlights

- **High Contrast**: White text on green bubbles for user messages (your eyes will thank you)
- **Smooth Interactions**: Hover effects that feel just right
- **Responsive Design**: Looks great on everything from phones to ultrawide monitors
- **PWA Ready**: Safe area support for notched devices

## 📝 Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Lint your code (make it pretty)
npm run typecheck  # Check TypeScript types
```

## 🤝 Contributing

Found a bug? Want to add a feature? Think you can make it even more awesome?

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request and describe your changes

## 📦 Release History

### v1.1.0 - *The Great Simplification*
- 🔄 Refactored chat architecture with simplified state management
- 🎨 Improved user message readability with white text
- ✨ Cleaner copy/share button interactions
- 🏗️ Better separation of concerns between chat logic and UI
- 📦 New `useChat` hook and `ChatView` component

## 🐛 Known Issues

- Sometimes Jarvis gets a little too chatty (working as intended?)
- The AI might occasionally think it's funnier than it actually is
- May cause increased productivity and slightly too much fun

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Tony Stark for the inspiration (and the name)
- The React team for making frontend development not terrible
- Coffee, for making this project possible
- The open source community for being awesome

---

*Built with ❤️ and probably too much caffeine*

**P.S.** If you find this project useful, give it a ⭐! It makes the developers happy and the code runs faster (probably).