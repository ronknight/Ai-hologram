import { useState, useEffect, useCallback } from 'react';

interface SpeechOptions {
  onTranscript: (transcript: string) => void;
}

export const useSpeech = ({ onTranscript }: SpeechOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [speechState, setSpeechState] = useState<'idle' | 'listening' | 'speaking'>('idle');

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onTranscript(transcript);
    setIsListening(false);
    setSpeechState('idle');
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    setIsListening(false);
    setSpeechState('idle');
  };

  const startListening = () => {
    setIsListening(true);
    setSpeechState('listening');
    recognition.start();
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    setSpeechState('speaking');
    utterance.onend = () => {
      setSpeechState('idle');
    };
    speechSynthesis.speak(utterance);
  };

  return { isListening, speechState, startListening, speak };
};
