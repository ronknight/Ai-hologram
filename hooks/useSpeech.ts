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

// Note: the spec exposes no way to query whether recognition is running, so the
// hook tracks that itself in runningRef. An earlier version of this file
// declared a `state` field here and branched on it; no browser implements it, so
// every guard read `undefined`, never stopped the running session, and the next
// start() threw InvalidStateError on repeat.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
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
  /** Fires the instant each buffered sentence starts being spoken, so callers
   * can reveal text in step with the voice instead of the moment it streams in. */
  onSpeakStart?: (sentence: string) => void;
}

// Matches one buffered sentence at a time: any run of non-terminators followed
// by the terminator(s) that close it. Text with no terminator yet (a chunk
// still arriving mid-sentence) is left in the buffer for the next call.
const SENTENCE_REGEX = /[^.!?\n]*[.!?\n]+/g;

// Chrome ends a continuous session on its own after a stretch of silence, so
// standby has to restart it. These bound that restart so a permanently failing
// microphone backs off instead of spinning.
const RESTART_DELAY_MS = 400;
const SHORT_SESSION_MS = 1000;
const MAX_SHORT_SESSIONS = 5;
const START_RETRY_MS = 150;
const START_RETRIES = 4;

export const useSpeech = ({ triggerWord, onActivation, onTranscript, onSpeakStart }: UseSpeechProps) => {
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sentenceQueueRef = useRef<string[]>([]);
  // Streamed text not yet resolved into a complete sentence (no terminator seen yet).
  const pendingTextRef = useRef('');
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wakeWordDetectedRef = useRef(false);
  // Text streamed from the model arrives in token-sized chunks. It is held
  // here until a sentence boundary shows up, so TTS speaks whole sentences
  // instead of restarting the synthesis engine for every fragment.
  const streamBufferRef = useRef('');
  // Resolving voices is asynchronous (the list populates after 'voiceschanged'),
  // so the picked voice is cached here rather than looked up per utterance.
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const warmedUpRef = useRef(false);

  // Mirrors of state that event handlers read. Recognition callbacks outlive the
  // render that installed them, so reading `speechState` there sees a stale
  // value; these refs are always current.
  const stateRef = useRef<SpeechState>('idle');
  const runningRef = useRef(false);
  const modeRef = useRef<'standby' | 'listening' | null>(null);
  const blockedRef = useRef(false);
  const speakingRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef(0);
  const shortSessionsRef = useRef(0);

  // Latest props, so the start/stop callbacks below can stay referentially
  // stable and not restart listening on every render of the consumer.
  const triggerWordRef = useRef(triggerWord);
  const onActivationRef = useRef(onActivation);
  const onTranscriptRef = useRef(onTranscript);
  const onSpeakStartRef = useRef(onSpeakStart);
  triggerWordRef.current = triggerWord;
  onActivationRef.current = onActivation;
  onTranscriptRef.current = onTranscript;
  onSpeakStartRef.current = onSpeakStart;

  const applyState = useCallback((next: SpeechState) => {
    stateRef.current = next;
    setSpeechState(next);
  }, []);

  // --- Speech Synthesis (TTS) ---
  // Chrome resolves voices lazily; grabbing one per utterance can stall the
  // first speak. Pick a local English voice once and reuse it.
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      voiceRef.current =
        voices.find((v) => v.lang.startsWith('en') && v.localService) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
    };
    pickVoice();
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pickVoice);
  }, []);

  // Chrome compiles its synthesis engine lazily, so the very first utterance
  // after page load carries a multi-second warm-up penalty. Burn that off on
  // a silent utterance during the user's mic gesture instead of mid-reply.
  const warmUpSpeech = useCallback(() => {
    if (warmedUpRef.current || !window.speechSynthesis) return;
    warmedUpRef.current = true;
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0;
    if (voiceRef.current) warm.voice = voiceRef.current;
    window.speechSynthesis.speak(warm);
  }, []);

  const processSentenceQueue = useCallback(() => {
    if (speakingRef.current) return;

    const textToSpeak = sentenceQueueRef.current.shift();
    if (!textToSpeak) {
      if (stateRef.current === 'speaking') applyState('idle');
      return;
    }

    speakingRef.current = true;
    applyState('speaking');
    onSpeakStartRef.current?.(textToSpeak);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 1.05;
    currentUtteranceRef.current = utterance;

    const advance = () => {
      speakingRef.current = false;
      currentUtteranceRef.current = null;
      processSentenceQueue();
    };
    utterance.onend = advance;
    utterance.onerror = advance;

    window.speechSynthesis.speak(utterance);
  }, [applyState]);

  // Streamed chunks rarely land on a sentence boundary, so this buffers them
  // and only queues text once a terminator closes a sentence — otherwise every
  // network chunk became its own utterance, and per-utterance engine startup
  // overhead made speech fall far behind the (instantly-appended) on-screen text.
  const speak = useCallback((text: string) => {
    pendingTextRef.current += text;

    const sentences: string[] = [];
    let consumed = 0;
    SENTENCE_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SENTENCE_REGEX.exec(pendingTextRef.current)) !== null) {
      const sentence = match[0].trim();
      if (sentence) sentences.push(sentence);
      consumed = SENTENCE_REGEX.lastIndex;
    }
    pendingTextRef.current = pendingTextRef.current.slice(consumed);

    if (sentences.length === 0) return;
    sentenceQueueRef.current.push(...sentences);
    processSentenceQueue();
  }, [processSentenceQueue]);

  /** Speaks whatever trailing text never reached a sentence terminator — call
   * once the stream that was feeding `speak` closes, or it's silently dropped. */
  const flush = useCallback(() => {
    const remaining = pendingTextRef.current.trim();
    pendingTextRef.current = '';
    if (!remaining) return;
    sentenceQueueRef.current.push(remaining);
    processSentenceQueue();
  }, [processSentenceQueue]);

  // Feed one streamed chunk. Only complete sentences are enqueued; the
  // trailing fragment stays buffered until more text or flushSpeak() arrives.
  const speakStream = useCallback((chunk: string) => {
    streamBufferRef.current += chunk;
    const complete = streamBufferRef.current.match(/[\s\S]*?[.!?]+(?=\s|$)/g);
    if (complete) {
      const spoken = complete.join('');
      streamBufferRef.current = streamBufferRef.current.slice(spoken.length);
      speak(spoken);
    }
  }, [speak]);

  const flushSpeak = useCallback(() => {
    if (streamBufferRef.current.trim()) speak(streamBufferRef.current);
    streamBufferRef.current = '';
  }, [speak]);

  const stopSpeaking = useCallback(() => {
    pendingTextRef.current = '';
    sentenceQueueRef.current = [];
    streamBufferRef.current = '';
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
      currentUtteranceRef.current = null;
    }
    speakingRef.current = false;
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // --- Speech Recognition (STT) ---
  const stopCurrentRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    modeRef.current = null;

    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onresult = null;
    recognition.onend = null;
    recognition.onerror = null;

    if (runningRef.current) {
      try {
        // abort() drops the session immediately; stop() waits for a final
        // result and would keep the microphone open past this call.
        recognition.abort();
      } catch {
        // Already finished on its own — nothing left to release.
      }
      runningRef.current = false;
    }
  }, []);

  const stop = useCallback(() => {
    stopCurrentRecognition();
    stopSpeaking();
    applyState('idle');
  }, [stopCurrentRecognition, stopSpeaking, applyState]);

  const safeStart = useCallback((recognition: SpeechRecognition, attempt = 0) => {
    try {
      recognition.start();
      runningRef.current = true;
      sessionStartRef.current = Date.now();
    } catch (error) {
      // Chrome throws InvalidStateError when start() lands before the previous
      // session has finished winding down from abort(). Wait it out instead of
      // logging, which is what produced the repeating "recognition has already
      // started" errors.
      if ((error as DOMException)?.name === 'InvalidStateError' && attempt < START_RETRIES) {
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (modeRef.current && !runningRef.current) safeStart(recognition, attempt + 1);
        }, START_RETRY_MS);
        return;
      }
      console.error('Failed to start recognition:', error);
      modeRef.current = null;
      runningRef.current = false;
      applyState('idle');
    }
  }, [applyState]);

  const handleRecognitionError = useCallback((event: SpeechRecognitionErrorEvent) => {
    // 'aborted' is what our own stopCurrentRecognition() raises, and 'no-speech'
    // is the normal end of a silent session. Neither is worth surfacing.
    if (event.error === 'aborted' || event.error === 'no-speech') return;

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      blockedRef.current = true;
      setPermissionError('Microphone permission denied. Please enable it in your browser settings.');
    } else if (event.error === 'audio-capture') {
      blockedRef.current = true;
      setPermissionError('No microphone found. Connect one and try again.');
    } else {
      console.error('SpeechRecognition error:', event.error);
    }

    stopCurrentRecognition();
    applyState('idle');
  }, [stopCurrentRecognition, applyState]);

  const startStandby = useCallback(() => {
    if (blockedRef.current || !SpeechRecognitionAPI) return;
    if (!recognitionRef.current || !triggerWordRef.current) return;
    // Already listening for the trigger word; starting again would only throw.
    if (modeRef.current === 'standby' && runningRef.current) return;

    stopCurrentRecognition();

    modeRef.current = 'standby';
    wakeWordDetectedRef.current = false;
    shortSessionsRef.current = 0;
    applyState('standby');

    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      shortSessionsRef.current = 0;
      if (transcript.includes(triggerWordRef.current.toLowerCase()) && !wakeWordDetectedRef.current) {
        wakeWordDetectedRef.current = true;
        onActivationRef.current();
      }
    };

    recognition.onend = () => {
      runningRef.current = false;
      if (modeRef.current !== 'standby' || blockedRef.current || wakeWordDetectedRef.current) return;

      // A session that ends almost immediately means the engine is refusing to
      // run. Restarting on a timer would produce the repeating console errors
      // this guard exists to prevent.
      shortSessionsRef.current =
        Date.now() - sessionStartRef.current < SHORT_SESSION_MS ? shortSessionsRef.current + 1 : 0;
      if (shortSessionsRef.current >= MAX_SHORT_SESSIONS) {
        setPermissionError('Voice input keeps disconnecting. Use the mic button or type instead.');
        stopCurrentRecognition();
        applyState('idle');
        return;
      }

      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (modeRef.current === 'standby' && !runningRef.current) safeStart(recognition);
      }, RESTART_DELAY_MS);
    };

    recognition.onerror = handleRecognitionError;

    safeStart(recognition);
  }, [stopCurrentRecognition, applyState, safeStart, handleRecognitionError]);

  const startListening = useCallback(() => {
    if (blockedRef.current || !SpeechRecognitionAPI) return;
    if (!recognitionRef.current) return;

    stopCurrentRecognition();

    modeRef.current = 'listening';
    applyState('listening');
    warmUpSpeech();

    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const finalTranscript = event.results[0][0].transcript.trim();
      if (finalTranscript) onTranscriptRef.current(finalTranscript);
    };

    recognition.onend = () => {
      runningRef.current = false;
      if (modeRef.current !== 'listening') return;
      modeRef.current = null;
      applyState('idle');
    };

    recognition.onerror = handleRecognitionError;

    safeStart(recognition);
  }, [stopCurrentRecognition, applyState, safeStart, handleRecognitionError]);

  /** Lets the user retry after fixing permissions, instead of being stuck with the banner. */
  const dismissError = useCallback(() => {
    blockedRef.current = false;
    shortSessionsRef.current = 0;
    setPermissionError(null);
  }, []);

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      blockedRef.current = true;
      setPermissionError('Speech recognition is not supported in this browser.');
      return;
    }

    if (!recognitionRef.current) {
      try {
        recognitionRef.current = new SpeechRecognitionAPI();
      } catch (e) {
        blockedRef.current = true;
        console.error('Error initializing SpeechRecognition:', e);
        setPermissionError('Failed to initialize speech recognition.');
      }
    }

    return () => {
      stopCurrentRecognition();
      stopSpeaking();
    };
  }, [stopCurrentRecognition, stopSpeaking]);

  return {
    speechState,
    permissionError,
    startStandby,
    startListening,
    speak,
    speakStream,
    flushSpeak,
    flush,
    stop,
    dismissError,
  };
};
