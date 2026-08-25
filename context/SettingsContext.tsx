
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Settings, OllamaModel, BackdropTheme } from '../types';
import { getModels } from '../services/ollama';
import { BACKDROP_ORDER } from '../components/backdropPresets';

interface SettingsContextType extends Settings {
  setOllamaUrl: (url: string) => void;
  setSelectedModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setTriggerWord: (word: string) => void;
  setBackdropTheme: (theme: BackdropTheme) => void;
  setHologramModel: (model: string) => void;
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
  backdropTheme: 'nature',
  hologramModel: 'ironman',
};

/** Only http(s) origins may be used as an API base; anything else (e.g. a
    javascript: or data: URL pasted into settings) falls back to the default. */
export function sanitizeOllamaUrl(raw: unknown): string {
  if (typeof raw !== 'string') return defaultSettings.ollamaUrl;
  try {
    const url = new URL(raw.trim());
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
    }
  } catch {
    // Not parseable; fall through to the default.
  }
  return defaultSettings.ollamaUrl;
}

const STRING_LIMITS = {
  selectedModel: 200,
  systemPrompt: 4000,
  triggerWord: 80,
} as const;

/** Re-validated field-by-field: localStorage content is untrusted input and
    older versions of the app may have stored malformed values. */
function loadSettings(): Settings {
  try {
    const savedSettings = localStorage.getItem('ai-chat-settings');
    if (!savedSettings) return defaultSettings;
    const parsed = JSON.parse(savedSettings) as Partial<Settings>;
    const temperature =
      typeof parsed.temperature === 'number' && Number.isFinite(parsed.temperature)
        ? Math.min(2, Math.max(0, parsed.temperature))
        : defaultSettings.temperature;
    const clampStr = (value: unknown, key: keyof typeof STRING_LIMITS, fallback: string) =>
      typeof value === 'string' ? value.slice(0, STRING_LIMITS[key]) : fallback;
    const theme = BACKDROP_ORDER.includes(parsed.backdropTheme as BackdropTheme)
      ? (parsed.backdropTheme as BackdropTheme)
      : defaultSettings.backdropTheme;
    return {
      ollamaUrl: sanitizeOllamaUrl(parsed.ollamaUrl),
      selectedModel: clampStr(parsed.selectedModel, 'selectedModel', defaultSettings.selectedModel),
      systemPrompt: clampStr(parsed.systemPrompt, 'systemPrompt', defaultSettings.systemPrompt),
      temperature,
      triggerWord: clampStr(parsed.triggerWord, 'triggerWord', defaultSettings.triggerWord).toLowerCase(),
      backdropTheme: theme,
    };
  } catch (error) {
    console.error('Failed to load settings from localStorage', error);
    return defaultSettings;
  }
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(loadSettings);

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
    setOllamaUrl: (url: string) => setSettings(s => ({ ...s, ollamaUrl: sanitizeOllamaUrl(url) })),
    setSelectedModel: (model: string) => setSettings(s => ({ ...s, selectedModel: model })),
    setSystemPrompt: (prompt: string) => setSettings(s => ({ ...s, systemPrompt: prompt })),
    setTemperature: (temp: number) => setSettings(s => ({...s, temperature: temp})),
    setTriggerWord: (word: string) => setSettings(s => ({ ...s, triggerWord: word })),
    setBackdropTheme: (theme: BackdropTheme) => setSettings(s => ({ ...s, backdropTheme: theme })),
    setHologramModel: (model: string) => setSettings(s => ({ ...s, hologramModel: model })),
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
