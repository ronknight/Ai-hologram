import React, { useState } from 'react';
import { MicIcon } from './icons/MicIcon';
import { useSpeech } from '../hooks/useSpeech';
import { generateChatStream } from '../services/ollama';

const ChatView: React.FC = () => {
  const [status, setStatus] = useState('Tap the mic to speak');
  const [llmResponse, setLlmResponse] = useState('');

  const handleTranscript = (transcript: string) => {
    setStatus('Thinking...');
    setLlmResponse('');
    generateChatStream(
      transcript,
      (chunk) => {
        setLlmResponse((prev) => prev + chunk);
      },
      () => {
        speak(llmResponse);
        setStatus('Tap the mic to speak');
      }
    );
  };

  const { isListening, speechState, startListening, speak } = useSpeech({ onTranscript: handleTranscript });

  const handleMicClick = () => {
    if (speechState === 'idle') {
      startListening();
      setStatus('Listening...');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 p-8 pointer-events-none">
      <div className="flex flex-col items-center space-y-4 pointer-events-auto">
        <p className="text-white/80 text-lg font-medium">
          {status}
        </p>
        <p className="text-white/80 text-lg font-medium">
          {llmResponse}
        </p>
        <button
          onClick={handleMicClick}
          className={`w-24 h-24 rounded-full bg-blue-500/80 flex items-center justify-center ${isListening ? 'animate-pulse' : ''}`}
        >
          <MicIcon className={`w-10 h-10 text-white`} />
        </button>
      </div>
    </div>
  );
};

export default ChatView;
