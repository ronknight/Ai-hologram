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
      <div className="relative min-h-screen bg-primary font-sans overflow-hidden">
        {/* Futuristic Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.secondary)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.secondary)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-50"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary/80 to-primary"></div>
           {/* Corner Brackets */}
          <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-accent/50 rounded-tl-lg"></div>
          <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-accent/50 rounded-tr-lg"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-accent/50 rounded-bl-lg"></div>
          <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-accent/50 rounded-br-lg"></div>
        </div>

        <header className="absolute top-0 left-0 right-0 z-30 p-6 flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <button 
                onClick={() => setView('chat')}
                className={`text-2xl font-bold transition-all duration-300 ${view === 'chat' ? 'text-accent drop-shadow-[0_0_8px_theme(colors.accent)]' : 'text-accent/60 hover:text-accent/90'}`}
              >
                AI Voice Assistant
              </button>
              <button 
                onClick={() => setView('playground')}
                className={`text-xl font-bold transition-all duration-300 ${view === 'playground' ? 'text-accent drop-shadow-[0_0_8px_theme(colors.accent)]' : 'text-accent/60 hover:text-accent/90'}`}
              >
                Playground
              </button>
            </div>
            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 rounded-full text-accent/70 hover:text-cyan hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-cyan transition-all duration-300"
              aria-label="Open Settings"
            >
              <SettingsIcon className="w-7 h-7" />
            </button>
        </header>
        
        <main className="relative z-10 pt-24">
          {view === 'chat' ? <ChatView /> : <OllamaPlayground />}
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
