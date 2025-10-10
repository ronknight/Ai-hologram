import React, { useState, useCallback, useEffect } from 'react';
import { ChatMessage, MessageRole } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../hooks/useSpeech';
import { generateChatStream } from '../services/ollama';
import Hologram from './Hologram';

type ChatMode = 'standby' | 'listening' | 'responding' | 'speaking';

const ChatView: React.FC = () => {
  const [mode, setMode] = useState<ChatMode>('standby');
  const { selectedModel, ollamaUrl, systemPrompt, temperature, triggerWord, connectionError } = useSettings();

  const handleActivation = useCallback(() => {
    speechHook.stop();
    setMode('listening');
  }, []);

  const handleTranscript = useCallback((transcript: string) => {
    if (transcript) {
      setMode('responding');
      generateResponse(transcript);
    } else {
      setMode('standby');
    }
  }, []);

  const speechHook = useSpeech({
    triggerWord,
    onActivation: handleActivation,
    onTranscript: handleTranscript,
  });

  const { permissionError } = speechHook;

  const generateResponse = useCallback(async (text: string) => {
    if (!selectedModel || !ollamaUrl) return;

    await generateChatStream(
      ollamaUrl,
      selectedModel,
      [{ role: MessageRole.USER, content: text }],
      systemPrompt,
      temperature,
      (chunk) => {
        speechHook.speak(chunk);
      },
      () => {
        // Stream finished
        setMode('standby');
      },
      (error) => {
        const errorMessage = `I encountered an error: ${error.message}`;
        speechHook.speak(errorMessage);
        setMode('standby');
      }
    );
  }, [selectedModel, ollamaUrl, systemPrompt, temperature, speechHook]);

  // Effect to sync component mode with speech hook's internal state
  useEffect(() => {
    if (speechHook.speechState === 'speaking' && mode !== 'speaking') {
      setMode('speaking');
    } else if (speechHook.speechState !== 'speaking' && mode === 'speaking') {
      setMode('standby');
    }
  }, [speechHook.speechState, mode]);

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <Hologram
        isListening={mode === 'listening'}
        isSpeaking={mode === 'speaking'}
        isIdle={mode === 'standby' || mode === 'responding'}
      />
      {(permissionError || connectionError) && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center">
          <p className="text-red-400/90 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
            {permissionError || 'Connection error. Check settings.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatView;