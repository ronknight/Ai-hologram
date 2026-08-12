import React, { useEffect, useState } from 'react';
import { MessageRole } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../hooks/useSpeech';
import { generateChatStream } from '../services/ollama';
import Hologram from './Hologram';
import { MicIcon } from './icons/MicIcon';
import { SendIcon } from './icons/SendIcon';

const ChatView: React.FC = () => {
  const { selectedModel, ollamaUrl, systemPrompt, temperature, triggerWord, connectionError } = useSettings();
  const [textInput, setTextInput] = useState('');
  const [lastReply, setLastReply] = useState('');

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLastReply('');
    generateChatStream(
      ollamaUrl,
      selectedModel,
      [{ role: MessageRole.USER, content: trimmed }],
      systemPrompt,
      temperature,
      (chunk) => {
        setLastReply((prev) => prev + chunk);
        speechHook.speak(chunk);
      },
      () => {},
      () => {
        const errorMessage = 'Sorry, I encountered an error.';
        setLastReply(errorMessage);
        speechHook.speak(errorMessage);
      }
    );
  };

  const speechHook = useSpeech({
    triggerWord,
    onActivation: () => {
      speechHook.stop();
      speechHook.startListening();
    },
    onTranscript: sendMessage,
  });

  useEffect(() => {
    if (!selectedModel || connectionError || speechHook.permissionError) {
      speechHook.stop();
      return;
    }
    speechHook.startStandby();
    return () => speechHook.stop();
    // speechHook is a fresh object every render; depending on it here would
    // restart standby listening on every render instead of only when these
    // three values actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel, connectionError, speechHook.permissionError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(textInput);
    setTextInput('');
  };

  const handleMicClick = () => {
    if (speechHook.speechState === 'listening') {
      speechHook.stop();
    } else {
      speechHook.startListening();
    }
  };

  return (
    <>
      <Hologram isListening={speechHook.speechState === 'listening'} isSpeaking={speechHook.speechState === 'speaking'} isIdle={speechHook.speechState === 'idle'} />

      {/* Voice is trigger-word activated and gives no feedback if it fails
          (permission denied, unsupported browser, etc.), so a typed message
          plus a manual mic button are the reliable way to talk to it. */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-6 flex flex-col items-center gap-3">
        {(speechHook.permissionError || connectionError) && (
          <p className="text-red-400 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
            {speechHook.permissionError || connectionError}
          </p>
        )}
        {lastReply && (
          <p className="text-accent/90 text-sm bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm max-w-xl text-center">
            {lastReply}
          </p>
        )}
        <form onSubmit={handleSubmit} className="w-full max-w-xl flex items-center gap-2">
          <button
            type="button"
            onClick={handleMicClick}
            aria-label={speechHook.speechState === 'listening' ? 'Stop listening' : 'Start listening'}
            className={`p-3 rounded-full transition-colors ${speechHook.speechState === 'listening' ? 'bg-cyan text-primary' : 'bg-secondary/80 text-accent hover:bg-secondary'}`}
          >
            <MicIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-secondary/80 border border-accent/30 rounded-full text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="p-3 rounded-full bg-accent/80 hover:bg-cyan text-white transition-colors"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatView;
