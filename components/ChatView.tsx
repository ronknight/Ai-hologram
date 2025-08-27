import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, MessageRole } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../hooks/useSpeech';
import { generateChatStream } from '../services/ollama';
import Hologram from './Hologram';
import { SendIcon } from './icons/SendIcon';

type ChatMode = 'standby' | 'listening' | 'responding' | 'speaking';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>('standby');
  const [inputText, setInputText] = useState('');
  const { selectedModel, ollamaUrl, systemPrompt, temperature, triggerWord, connectionError } = useSettings();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleActivation = useCallback(() => {
    speechHook.stop();
    setMode('listening');
  }, []);

  const handleTranscript = useCallback((transcript: string) => {
    if (transcript) {
      setMode('responding');
      handleUserMessage(transcript);
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

  // Effect to manage speech hook based on mode
  useEffect(() => {
    if (!selectedModel || connectionError || permissionError) {
      speechHook.stop();
      return;
    }
    
    if (mode === 'standby') {
      speechHook.startStandby();
    } else if (mode === 'listening') {
      speechHook.startListening();
    } else if (mode === 'responding') {
      speechHook.stop();
    }
    
    // Do not call stop() when speaking, as it would cut off TTS
    return () => {
        if(mode !== 'speaking') {
            speechHook.stop();
        }
    }
  }, [mode, selectedModel, connectionError, permissionError]);

  // Effect to sync component mode with speech hook's internal state
  useEffect(() => {
    if (speechHook.speechState === 'speaking' && mode !== 'speaking') {
      setMode('speaking');
    } else if (speechHook.speechState !== 'speaking' && mode === 'speaking') {
      // TTS finished, go back to standby
      setMode('standby');
    }
  }, [speechHook.speechState, mode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUserMessage = (text: string) => {
    const newUserMessage: ChatMessage = { role: MessageRole.USER, content: text };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);

    const newAssistantMessage: ChatMessage = { role: MessageRole.ASSISTANT, content: '' };
    setMessages(prev => [...prev, newAssistantMessage]);

    generateChatStream(
      ollamaUrl,
      selectedModel,
      newMessages,
      systemPrompt,
      temperature,
      (chunk) => {
        speechHook.speak(chunk);
        setMessages(prev => {
          const lastMsgIndex = prev.length - 1;
          const updatedMessages = [...prev];
          if (updatedMessages[lastMsgIndex].role === MessageRole.ASSISTANT) {
            const updatedContent = updatedMessages[lastMsgIndex].content + chunk;
            updatedMessages[lastMsgIndex] = { ...updatedMessages[lastMsgIndex], content: updatedContent };
          }
          return updatedMessages;
        });
      },
      () => {
        // onClose: Stream is finished. The speech hook will handle transitioning
        // its state, which will then trigger our useEffect to go to standby.
      },
      (error) => {
        console.error("Streaming error:", error);
        const errorMessage = `Sorry, I encountered an error: ${error.message}`;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: MessageRole.ASSISTANT, content: errorMessage };
          return updated;
        });
        speechHook.speak(errorMessage);
      }
    );
  };
  
  const handleTextInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || mode === 'listening' || mode === 'responding') return;

    speechHook.stop(); // Interrupt any ongoing TTS or listening
    setMode('responding');
    handleUserMessage(text);
    setInputText('');
  };

  const getStatusText = () => {
    if (permissionError) return permissionError;
    if (connectionError || !selectedModel) return "Connection error. Check settings.";
    switch (mode) {
      case 'standby':
        return `Say "${triggerWord}" or type a message`;
      case 'listening':
        return 'Listening...';
      case 'responding':
      case 'speaking':
        return 'Processing...';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] w-full items-center justify-between p-4">
      <div className="w-full max-w-4xl flex-grow overflow-y-auto pb-56 space-y-6 scrollbar-thin scrollbar-thumb-secondary">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-prose p-4 border rounded-lg backdrop-blur-sm transition-all duration-300 ${msg.role === MessageRole.USER ? 'bg-accent/20 border-accent/30 text-white' : 'bg-secondary/50 border-gray-600/50 text-gray-300'}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {mode === 'responding' && (
          <div className="flex justify-start">
            <div className="max-w-prose p-4 rounded-lg bg-secondary/50 border border-gray-600/50">
              <div className="w-16 h-2 relative overflow-hidden rounded-full bg-primary">
                <div className="absolute h-full w-full bg-accent animate-scan-across rounded-full"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-primary via-primary/90 to-transparent p-6 flex flex-col items-center z-20">
        <Hologram
          isListening={mode === 'listening'}
          isSpeaking={mode === 'speaking'}
          isIdle={mode === 'standby' || mode === 'responding'}
        />
        <form onSubmit={handleTextInputSubmit} className="w-full max-w-2xl flex items-center space-x-2 mt-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            disabled={mode === 'listening' || mode === 'responding'}
            className="w-full px-5 py-3 bg-primary/70 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan focus:border-cyan transition-all duration-300 text-gray-200 placeholder-gray-500 disabled:opacity-50"
            aria-label="Chat message input"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || mode === 'listening' || mode === 'responding'}
            className="flex-shrink-0 p-3 bg-accent/80 hover:bg-cyan rounded-full text-white transition-all duration-300 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan"
            aria-label="Send message"
          >
            <SendIcon className="w-6 h-6" />
          </button>
        </form>
        <div className="h-10 text-center flex items-center justify-center mt-2">
            {(permissionError || connectionError || !selectedModel) ? (
                <p className="text-red-500 font-mono tracking-widest text-sm">
                    {getStatusText()}
                </p>
            ) : (
                <p className="text-accent/80 font-mono tracking-widest text-sm animate-pulse">
                    {getStatusText()}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatView;