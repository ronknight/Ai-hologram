import React, { useState } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import ChatView from './components/ChatView';
import SettingsModal from './components/SettingsModal';
import { SettingsIcon } from './components/icons/SettingsIcon';
import OllamaPlayground from './components/OllamaPlayground';

type View = 'chat' | 'playground';

const VIEWS: { id: View; label: string; shortLabel: string }[] = [
  { id: 'chat', label: 'AI Voice Assistant', shortLabel: 'Assistant' },
  { id: 'playground', label: 'Playground', shortLabel: 'Playground' },
];

const NAV_STYLES = {
  active: 'text-cyan bg-cyan/10 shadow-[0_0_16px_theme(colors.glow)]',
  inactive: 'text-accent/60 hover:text-accent hover:bg-accent/5',
};

const App: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [view, setView] = useState<View>('chat');

  return (
    <SettingsProvider>
      <div className="relative min-h-[100dvh] bg-primary font-sans overflow-hidden">
        {/* Futuristic Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Radial glow behind the hologram */}
          <div className="absolute left-1/2 top-1/3 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.secondary)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.secondary)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary/80 to-primary"></div>
        </div>

        <header className="fixed top-3 sm:top-4 left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 animate-rise-in">
          <nav className="flex items-center gap-2 rounded-full border border-accent/15 bg-secondary/70 px-2 py-1.5 shadow-lg shadow-black/40 backdrop-blur-md">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {VIEWS.map(({ id, label, shortLabel }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  aria-current={view === id ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan sm:text-base ${
                    view === id ? NAV_STYLES.active : NAV_STYLES.inactive
                  }`}
                >
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="shrink-0 rounded-full p-2 text-accent/70 transition-all duration-300 hover:bg-accent/10 hover:text-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
              aria-label="Open Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </nav>
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
