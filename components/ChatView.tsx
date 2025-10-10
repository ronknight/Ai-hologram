

import React, { useEffect } from 'react';
import { MessageRole } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../hooks/useSpeech';
import { generateChatStream } from '../services/ollama';
import Hologram from './Hologram';

const ChatView: React.FC = () => {
  const { selectedModel, ollamaUrl, systemPrompt, temperature, triggerWord, connectionError } = useSettings();
  const speechHook = useSpeech({
    triggerWord,
    onActivation: () => {
      speechHook.stop();
      speechHook.startListening();
    },
    onTranscript: (transcript: string) => {
      if (!transcript) return;
      generateChatStream(
        ollamaUrl,
        selectedModel,
  [{ role: MessageRole.USER, content: transcript }],
        systemPrompt,
        temperature,
        (chunk) => speechHook.speak(chunk),
        () => {},
        (error) => speechHook.speak('Sorry, I encountered an error.')
      );
    }
  });

  useEffect(() => {
    if (!selectedModel || connectionError || speechHook.permissionError) {
      speechHook.stop();
      return;
    }
    speechHook.startStandby();
    return () => speechHook.stop();
  }, [selectedModel, connectionError, speechHook]);

  return (
    <Hologram isListening={speechHook.speechState === 'listening'} isSpeaking={speechHook.speechState === 'speaking'} isIdle={speechHook.speechState === 'idle'} />
  );
};

export default ChatView;