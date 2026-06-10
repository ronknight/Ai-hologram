# Project Context

## Purpose
This project is an AI-powered voice chat application featuring a realistic hologram interface. It provides a futuristic UI for interacting with AI models running on a local Ollama server, supporting both voice and text input with real-time streaming responses. The application includes an admin panel for configuration and a playground for testing advanced prompting strategies.

## Tech Stack
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with PostCSS and Autoprefixer
- **3D Graphics**: Three.js with @react-three/fiber and @react-three/drei
- **Speech**: Web Speech API (SpeechRecognition for STT, SpeechSynthesis for TTS)
- **AI Backend**: Local Ollama server for language model inference
- **Development**: Node.js, npm for package management

## Project Conventions

### Code Style
- **Language**: TypeScript for type safety
- **Component Style**: Functional components with React.FC type annotation
- **State Management**: React hooks (useState, useContext) for local state
- **Naming**: camelCase for variables/functions, PascalCase for components/types/interfaces
- **Imports**: Absolute imports from project root
- **Documentation**: Detailed JSDoc comments for functions and interfaces
- **Error Handling**: Try/catch blocks with descriptive error messages
- **Async Operations**: Async/await pattern with proper error propagation

### Architecture Patterns
- **Component Structure**: Modular components in `/components` directory with subdirectories for icons
- **State Management**: React Context API for global settings (SettingsContext)
- **Services Layer**: API interaction logic in `/services` directory
- **Hooks**: Custom hooks in `/hooks` directory for reusable logic
- **Types**: Centralized type definitions in `types.ts`
- **Configuration**: Environment-specific configs in root (vite.config.ts, tailwind.config.js)

### Testing Strategy
[No formal testing framework implemented yet. Manual testing through UI interactions and console logging.]

### Git Workflow
[Standard Git workflow with main branch. No specific branching strategy documented yet.]

## Domain Context
- **AI Interaction**: Conversational AI with streaming responses
- **Voice Processing**: Speech-to-text and text-to-speech integration
- **3D Visualization**: Holographic interface using Three.js for visual feedback
- **Local AI**: Privacy-focused approach using local Ollama models instead of cloud APIs
- **Prompt Engineering**: Advanced prompting strategies for structured outputs (JSON, constrained text, rich content, grounded Q&A)

## Important Constraints
- Requires local Ollama server running (default: http://localhost:11434)
- Browser must support Web Speech API for voice features
- Microphone permission required for voice input
- Local AI models may have performance limitations compared to cloud services

## External Dependencies
- **Ollama Server**: Local AI model server for inference
- **Web Speech API**: Browser-native speech recognition and synthesis
- **Three.js Ecosystem**: For 3D hologram rendering
