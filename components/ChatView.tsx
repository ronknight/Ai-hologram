import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage, MessageRole } from '../types';
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
  const { selectedModel, ollamaUrl, systemPrompt, temperature, triggerWord, connectionError, backdropTheme, hologramModel } = useSettings();
  const [textInput, setTextInput] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  // Guards against a completed stream flushing into a request that was
  // already superseded (barge-in or a newer message).
  const requestSeqRef = useRef(0);
  // Prior turns, so the model has context for follow-ups instead of answering
  // each message cold. Excludes the system prompt — generateChatStream adds
  // that itself.
  const [history, setHistory] = useState<ChatMessage[]>([]);
  // Accumulates the raw streamed reply for the history entry. Separate from
  // `lastReply`, which now only fills in sentence-by-sentence as each is
  // spoken (see onSpeakStart) — history needs the full text, not the
  // currently-revealed portion.
  const replyBufferRef = useRef('');

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const seq = ++requestSeqRef.current;
    setIsStreaming(true);
    setLastReply('');
    replyBufferRef.current = '';

    const userMessage: ChatMessage = { role: MessageRole.USER, content: trimmed };
    const outgoing = [...history, userMessage];
    setHistory(outgoing);

    generateChatStream(
      ollamaUrl,
      selectedModel,
      outgoing,
      systemPrompt,
      temperature,
      // Buffer streamed tokens and only enqueue complete sentences, so TTS
      // speaks whole sentences instead of restarting per fragment.
      (chunk) => {
        if (seq !== requestSeqRef.current) return;
        replyBufferRef.current += chunk;
        // Text is revealed via onSpeakStart below, in step with the voice,
        // not here — appending on arrival let it race far ahead of speech.
        speechHookRef.current?.speakStream(chunk);
      },
      () => {
        if (seq !== requestSeqRef.current) return;
        speechHookRef.current?.flushSpeak();
        setIsStreaming(false);
        const reply = replyBufferRef.current.trim();
        if (reply) {
          setHistory((prev) => [...prev, { role: MessageRole.ASSISTANT, content: reply }]);
        }
      },
      () => {
        if (seq !== requestSeqRef.current) return;
        const errorMessage = 'Sorry, I encountered an error.';
        setLastReply(errorMessage);
        speechHookRef.current?.speak(errorMessage);
        setIsStreaming(false);
      }
    );
  }, [history, isStreaming, ollamaUrl, selectedModel, systemPrompt, temperature]);

  const speechHook = useSpeech({
    triggerWord,
    onActivation: () => {
      // Barge-in: cut off whatever the assistant is saying before listening.
      speechHook.stop();
      speechHook.startListening();
    },
    onTranscript: sendMessage,
    onSpeakStart: (sentence) => setLastReply((prev) => (prev ? `${prev} ${sentence}` : sentence)),
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
        hologramModel={hologramModel}
      />

      {/* Voice is trigger-word activated and gives no feedback if it fails
          (permission denied, unsupported browser, etc.), so a typed message
          plus a manual mic button are the reliable way to talk to it. */}
      {/* w-full + overflow-hidden keeps a long error string from pushing the
          whole bar wider than a phone screen and shunting the send button off. */}
      <div className="fixed bottom-0 left-0 right-0 z-40 w-full overflow-hidden p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-6 flex flex-col items-center gap-2 sm:gap-3">
        {banner && (
          <div className="flex animate-rise-in items-start gap-2 w-full max-w-xl text-red-400 text-xs sm:text-sm border border-red-500/30 bg-black/60 pl-4 pr-2 py-2 rounded-2xl backdrop-blur-md">
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
            className={`animate-fade-in rounded-full border border-cyan/20 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] backdrop-blur-md sm:text-xs ${
              speechState === 'speaking' ? 'text-cyan shadow-[0_0_16px_theme(colors.glow)]' : 'text-accent/70'
            }`}
          >
            <span className={speechState === 'speaking' ? 'animate-pulse' : undefined}>{statusText}</span>
          </p>
        )}
        {lastReply && (
          <p className="max-h-32 max-w-xl animate-rise-in overflow-y-auto rounded-2xl border border-accent/15 bg-black/50 px-4 py-2 text-center text-sm text-accent/90 shadow-lg shadow-black/30 backdrop-blur-md">
            {lastReply}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex w-full max-w-xl items-center gap-2 rounded-full border border-accent/20 bg-secondary/60 p-1.5 pl-1.5 shadow-lg shadow-black/40 backdrop-blur-md transition-colors focus-within:border-cyan/50">
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isStreaming}
            aria-label={speechState === 'listening' ? 'Stop listening' : 'Start listening'}
            className={`shrink-0 rounded-full p-3 transition-all duration-300 disabled:opacity-40 ${
              speechState === 'listening'
                ? 'bg-cyan text-primary shadow-[0_0_16px_theme(colors.glow)]'
                : 'text-accent hover:bg-accent/15'
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
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-base text-gray-200 placeholder:text-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isStreaming || !textInput.trim()}
            aria-label="Send message"
            className="shrink-0 rounded-full bg-accent/80 p-3 text-white transition-all duration-300 hover:bg-cyan hover:shadow-[0_0_16px_theme(colors.glow)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:opacity-40 disabled:hover:bg-accent/80 disabled:hover:shadow-none"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatView;
