
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Settings, OllamaModel } from '../types';
import { getModels } from '../services/ollama';

interface SettingsContextType extends Settings {
  setOllamaUrl: (url: string) => void;
  setSelectedModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setTriggerWord: (word: string) => void;
  availableModels: OllamaModel[];
  refreshModels: () => Promise<void>;
  isModelLoading: boolean;
  connectionError: string | null;
}

const defaultSettings: Settings = {
  ollamaUrl: 'http://localhost:11434',
  selectedModel: 'gemma2:2b',
  systemPrompt: 'You are a helpful and concise AI assistant.',
  temperature: 0.7,
  triggerWord: 'hey assistant',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const savedSettings = localStorage.getItem('ai-chat-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Ensure default values for any missing keys
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage', error);
    }
    return defaultSettings;
  });

  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('ai-chat-settings', JSON.stringify(settings));
  }, [settings]);

  const refreshModels = useCallback(async () => {
    setIsModelLoading(true);
    setConnectionError(null);
    try {
      const models = await getModels(settings.ollamaUrl);
      setAvailableModels(models);
      if (models.length > 0 && !models.some(m => m.name === settings.selectedModel)) {
        // If the preferred model (gemma2:2b) isn't found, default to the first available one.
        setSettings(s => ({ ...s, selectedModel: models[0].name }));
      }
    } catch (error) {
      setConnectionError('Failed to connect to Ollama. Please check the URL and ensure Ollama is running.');
      setAvailableModels([]);
      console.error(error);
    } finally {
      setIsModelLoading(false);
    }
  }, [settings.ollamaUrl, settings.selectedModel]);

  useEffect(() => {
    refreshModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.ollamaUrl]);

  const value = {
    ...settings,
    setOllamaUrl: (url: string) => setSettings(s => ({ ...s, ollamaUrl: url })),
    setSelectedModel: (model: string) => setSettings(s => ({ ...s, selectedModel: model })),
    setSystemPrompt: (prompt: string) => setSettings(s => ({ ...s, systemPrompt: prompt })),
    setTemperature: (temp: number) => setSettings(s => ({...s, temperature: temp})),
    setTriggerWord: (word: string) => setSettings(s => ({ ...s, triggerWord: word })),
    availableModels,
    refreshModels,
    isModelLoading,
    connectionError,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
