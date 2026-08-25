import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageRole } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../hooks/useSpeech';
import { generateChatStream } from '../services/ollama';
import Hologram from './Hologram';
import { MicIcon } from './icons/MicIcon';
import { SendIcon } from './icons/SendIcon';

interface ChatViewProps {
  /** False while another tab is showing; the view stays mounted but must not hold the microphone. */
  active?: boolean;
}

const STATUS_TEXT: Record<string, string> = {
  standby: 'Say the trigger word',
  listening: 'Listening…',
  speaking: 'Speaking…',
};

const ChatView: React.FC<ChatViewProps> = ({ active = true }) => {
  const { selectedModel, ollamaUrl, systemPrompt, temperature, triggerWord, connectionError, backdropTheme } = useSettings();
  const [textInput, setTextInput] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  // Guards against a completed stream flushing into a request that was
  // already superseded (barge-in or a newer message).
  const requestSeqRef = useRef(0);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const seq = ++requestSeqRef.current;
    setIsStreaming(true);
    setLastReply('');
    generateChatStream(
      ollamaUrl,
      selectedModel,
      [{ role: MessageRole.USER, content: trimmed }],
      systemPrompt,
      temperature,
      // Buffer streamed tokens and only enqueue complete sentences, so TTS
      // speaks whole sentences instead of restarting per fragment.
      (chunk) => {
        if (seq !== requestSeqRef.current) return;
        setLastReply((prev) => prev + chunk);
        speechHookRef.current?.speakStream(chunk);
      },
      () => {
        if (seq !== requestSeqRef.current) return;
        speechHookRef.current?.flushSpeak();
        setIsStreaming(false);
      },
      () => {
        if (seq !== requestSeqRef.current) return;
        const errorMessage = 'Sorry, I encountered an error.';
        setLastReply(errorMessage);
        speechHookRef.current?.speak(errorMessage);
        setIsStreaming(false);
      }
    );
  }, [isStreaming, ollamaUrl, selectedModel, systemPrompt, temperature]);

  const speechHook = useSpeech({
    triggerWord,
    onActivation: () => {
      // Barge-in: cut off whatever the assistant is saying before listening.
      speechHook.stop();
      speechHook.startListening();
    },
    onTranscript: sendMessage,
  });
  // The hook result is a fresh object every render; keeping the latest one in
  // a ref lets sendMessage's stream callbacks stay referentially stable.
  const speechHookRef = useRef(speechHook);
  speechHookRef.current = speechHook;

  // These are stable across renders (the hook keeps the changing callbacks in
  // refs), so the effect below only re-runs when something real changes.
  const { startStandby, stop, permissionError, speechState } = speechHook;

  useEffect(() => {
    if (!active || !selectedModel || connectionError || permissionError) {
      stop();
      return;
    }
    startStandby();
    return () => stop();
  }, [active, selectedModel, connectionError, permissionError, startStandby, stop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(textInput);
    setTextInput('');
  };

  const handleMicClick = () => {
    if (speechState === 'listening') {
      stop();
    } else {
      speechHook.startListening();
    }
  };

  const banner = permissionError || connectionError;
  const statusText =
    isStreaming && speechState !== 'speaking' ? 'Thinking…' : STATUS_TEXT[speechState];

  return (
    <>
      <Hologram
        isListening={speechState === 'listening'}
        isSpeaking={speechState === 'speaking'}
        isIdle={speechState === 'idle'}
        backdropTheme={backdropTheme}
      />

      {/* Voice is trigger-word activated and gives no feedback if it fails
          (permission denied, unsupported browser, etc.), so a typed message
          plus a manual mic button are the reliable way to talk to it. */}
      {/* w-full + overflow-hidden keeps a long error string from pushing the
          whole bar wider than a phone screen and shunting the send button off. */}
      <div className="fixed bottom-0 left-0 right-0 z-40 w-full overflow-hidden p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-6 flex flex-col items-center gap-2 sm:gap-3">
        {banner && (
          <div className="flex items-start gap-2 w-full max-w-xl text-red-400 text-xs sm:text-sm bg-black/60 pl-4 pr-2 py-2 rounded-2xl backdrop-blur-sm">
            <span className="min-w-0 flex-1 py-0.5 break-words">{banner}</span>
            {permissionError && (
              <button
                type="button"
                onClick={speechHook.dismissError}
                aria-label="Dismiss microphone message"
                className="shrink-0 px-2 rounded-full text-red-300 hover:text-white hover:bg-red-500/30 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        )}
        {statusText && (
          <p
            aria-live="polite"
            className={`text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm ${
              speechState === 'speaking' ? 'text-cyan animate-pulse' : 'text-accent/70'
            }`}
          >
            {statusText}
          </p>
        )}
        {lastReply && (
          <p className="text-accent/90 text-sm bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm max-w-xl max-h-32 overflow-y-auto text-center">
            {lastReply}
          </p>
        )}
        <form onSubmit={handleSubmit} className="w-full max-w-xl flex items-center gap-2">
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isStreaming}
            aria-label={speechState === 'listening' ? 'Stop listening' : 'Start listening'}
            className={`shrink-0 p-3 rounded-full transition-colors disabled:opacity-50 ${
              speechState === 'listening' ? 'bg-cyan text-primary' : 'bg-secondary/80 text-accent hover:bg-secondary'
            }`}
          >
            <MicIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a message..."
            /* text-base keeps iOS Safari from zooming the page in on focus. */
            className="min-w-0 flex-1 px-4 py-3 text-base bg-secondary/80 border border-accent/30 rounded-full text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan"
          />
          <button
            type="submit"
            disabled={isStreaming || !textInput.trim()}
            aria-label="Send message"
            className="shrink-0 p-3 rounded-full bg-accent/80 hover:bg-cyan text-white transition-colors disabled:opacity-50 disabled:hover:bg-accent/80"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatView;
