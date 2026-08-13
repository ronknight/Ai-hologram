import React, { useState } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import ChatView from './components/ChatView';
import SettingsModal from './components/SettingsModal';
import { SettingsIcon } from './components/icons/SettingsIcon';
import OllamaPlayground from './components/OllamaPlayground';

type View = 'chat' | 'playground';

const App: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [view, setView] = useState<View>('chat');

  return (
    <SettingsProvider>
      <div className="relative min-h-[100dvh] bg-primary font-sans overflow-hidden">
        {/* Futuristic Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.secondary)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.secondary)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-50"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary/80 to-primary"></div>
           {/* Corner Brackets */}
          <div className="absolute top-2 left-2 w-10 h-10 sm:top-4 sm:left-4 sm:w-16 sm:h-16 border-t-2 border-l-2 border-accent/50 rounded-tl-lg"></div>
          <div className="absolute top-2 right-2 w-10 h-10 sm:top-4 sm:right-4 sm:w-16 sm:h-16 border-t-2 border-r-2 border-accent/50 rounded-tr-lg"></div>
          <div className="absolute bottom-2 left-2 w-10 h-10 sm:bottom-4 sm:left-4 sm:w-16 sm:h-16 border-b-2 border-l-2 border-accent/50 rounded-bl-lg"></div>
          <div className="absolute bottom-2 right-2 w-10 h-10 sm:bottom-4 sm:right-4 sm:w-16 sm:h-16 border-b-2 border-r-2 border-accent/50 rounded-br-lg"></div>
        </div>

        <header className="absolute top-0 left-0 right-0 z-30 p-4 sm:p-6 flex justify-between items-center gap-2">
            <div className="flex items-center gap-3 sm:gap-8 min-w-0">
              <button
                onClick={() => setView('chat')}
                className={`text-base sm:text-2xl font-bold whitespace-nowrap transition-all duration-300 ${view === 'chat' ? 'text-accent drop-shadow-[0_0_8px_theme(colors.accent)]' : 'text-accent/60 hover:text-accent/90'}`}
              >
                {/* The full name plus Playground plus the gear does not fit a
                    narrow phone, and pushes the gear off screen. */}
                <span className="sm:hidden">Assistant</span>
                <span className="hidden sm:inline">AI Voice Assistant</span>
              </button>
              <button
                onClick={() => setView('playground')}
                className={`text-sm sm:text-xl font-bold whitespace-nowrap transition-all duration-300 ${view === 'playground' ? 'text-accent drop-shadow-[0_0_8px_theme(colors.accent)]' : 'text-accent/60 hover:text-accent/90'}`}
              >
                Playground
              </button>
            </div>
            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="shrink-0 p-2 sm:p-3 rounded-full text-accent/70 hover:text-cyan hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-cyan transition-all duration-300"
              aria-label="Open Settings"
            >
              <SettingsIcon className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
        </header>

        {/* Both views stay mounted. Swapping them out tears down the WebGL
            context and re-downloads the 9 MB hologram on every tab switch,
            which is what produced the "Context Lost" warning. */}
        <main className="relative z-10 pt-20 sm:pt-24">
          <div className={view === 'chat' ? 'contents' : 'hidden'}>
            <ChatView active={view === 'chat'} />
          </div>
          <div className={view === 'playground' ? 'contents' : 'hidden'}>
            <OllamaPlayground />
          </div>
        </main>
        
        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </SettingsProvider>
  );
};

export default App;
