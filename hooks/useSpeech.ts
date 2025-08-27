import { useState, useEffect, useRef, useCallback } from 'react';

// --- Type definitions for Web Speech API to fix TypeScript errors ---
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { readonly transcript: string };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}
// --- End of type definitions ---

// Polyfill for browsers that use webkit prefix. Renamed to avoid shadowing the SpeechRecognition type.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export type SpeechState = 'idle' | 'standby' | 'listening' | 'speaking';

interface UseSpeechProps {
  triggerWord: string;
  onActivation: () => void;
  onTranscript: (transcript: string) => void;
}

export const useSpeech = ({ triggerWord, onActivation, onTranscript }: UseSpeechProps) => {
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sentenceQueueRef = useRef<string[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wakeWordDetectedRef = useRef(false);

  // --- Speech Synthesis (TTS) ---
  const processSentenceQueue = useCallback(() => {
    if (speechState === 'speaking' || sentenceQueueRef.current.length === 0) {
      return;
    }
    
    setSpeechState('speaking');
    const textToSpeak = sentenceQueueRef.current.shift();
    if (textToSpeak) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      currentUtteranceRef.current = utterance;

      utterance.onend = () => {
        if (sentenceQueueRef.current.length > 0) {
            processSentenceQueue();
        } else {
            setSpeechState('idle');
        }
      };
      utterance.onerror = (event) => {
        console.error('SpeechSynthesis Error', event);
        setSpeechState('idle'); // Reset on error
        processSentenceQueue();
      };

      window.speechSynthesis.speak(utterance);
    } else {
        setSpeechState('idle');
    }
  }, [speechState]);

  const speak = useCallback((text: string) => {
    const sentences = text.match(/[^.!?]+[.!?\n]*/g) || [text];
    sentenceQueueRef.current.push(...sentences.filter(s => s.trim().length > 0));
    processSentenceQueue();
  }, [processSentenceQueue]);

  // --- Speech Recognition (STT) ---
  const stopCurrentRecognition = useCallback(() => {
    if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
    }
  }, []);
  
  const startStandby = useCallback(() => {
    if (permissionError) return;
    stopCurrentRecognition();
    if (!recognitionRef.current || !triggerWord) return;

    setSpeechState('standby');
    wakeWordDetectedRef.current = false;
    
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      if (transcript.includes(triggerWord.toLowerCase()) && !wakeWordDetectedRef.current) {
        wakeWordDetectedRef.current = true;
        onActivation();
      }
    };
    
    recognition.onend = () => {
       if (!wakeWordDetectedRef.current && speechState === 'standby') {
           recognition.start();
       }
    };

    recognition.onerror = (event) => {
        console.error("Standby SpeechRecognition error", event.error);
        if (event.error === 'not-allowed') {
            stopCurrentRecognition(); // Stop immediately to prevent onend from restarting
            setPermissionError('Microphone permission denied. Please enable it in your browser settings.');
            setSpeechState('idle');
        } else if (event.error !== 'no-speech') {
            setSpeechState('idle');
        }
    };
    
    recognition.start();

  }, [stopCurrentRecognition, triggerWord, onActivation, speechState, permissionError]);

  const startListening = useCallback(() => {
    if (permissionError) return;
    stopCurrentRecognition();
    if (!recognitionRef.current) return;
    
    setSpeechState('listening');

    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const finalTranscript = event.results[0][0].transcript.trim();
        if (finalTranscript) {
          onTranscript(finalTranscript);
        }
    };

    recognition.onend = () => {
      if (speechState === 'listening') {
        setSpeechState('idle');
      }
    };

    recognition.onerror = (event) => {
      console.error("Active Listening SpeechRecognition error", event.error);
       if (event.error === 'not-allowed') {
        setPermissionError('Microphone permission denied. Please enable it in your browser settings.');
      }
      setSpeechState('idle');
    };
    
    recognition.start();
  }, [stopCurrentRecognition, onTranscript, speechState