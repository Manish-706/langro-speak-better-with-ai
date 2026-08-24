'use client';

import { useRef, useCallback, useEffect } from 'react';

const NON_CONTENT_FILLERS = new Set([
  'um', 'uh', 'er', 'ah', 'hmm', 'yeah', 'yep', 'okay', 'ok', 'sure', 'haha', 'heh', 'lol',
]);

function isMeaningfulUtterance(text: string): boolean {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (!clean || clean.length < 2) return false;
  const words = clean.split(/\s+/);
  if (words.length === 1 && NON_CONTENT_FILLERS.has(words[0])) return false;
  return true;
}

interface UseTurnDetectionOptions {
  onTurnComplete: (speakerId: string, text: string) => void;
  debounceMs?: number;
}

export function useTurnDetection({
  onTurnComplete,
  debounceMs = 500,
}: UseTurnDetectionOptions) {
  const debounceTimerRef = useRef<any>(null);
  const pendingUtteranceRef = useRef<{ speakerId: string; text: string } | null>(null);
  const lastEmittedTextRef = useRef<string>('');

  const onTurnCompleteRef = useRef(onTurnComplete);
  useEffect(() => {
    onTurnCompleteRef.current = onTurnComplete;
  });

  const finalizeTurn = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (pendingUtteranceRef.current) {
      const { speakerId, text } = pendingUtteranceRef.current;
      pendingUtteranceRef.current = null;

      // Prevent emitting exact duplicate turns in immediate succession
      if (text !== lastEmittedTextRef.current && isMeaningfulUtterance(text)) {
        lastEmittedTextRef.current = text;
        console.log(`[useTurnDetection] 🎙 Turn complete! (${speakerId}): "${text}"`);
        onTurnCompleteRef.current(speakerId, text);
      }
    }
  }, []);

  const processSpeechResult = useCallback(
    (speakerId: string, transcript: string, isFinal: boolean) => {
      if (!transcript || !transcript.trim()) return;
      const text = transcript.trim();

      // Reset debounce timer on every new speech chunk
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      pendingUtteranceRef.current = { speakerId, text };

      if (isFinal) {
        // If Chrome returned isFinal, finalize shortly (300ms debounce)
        debounceTimerRef.current = setTimeout(() => {
          finalizeTurn();
        }, 300);
      } else {
        // For interim speech: if speaker pauses for debounceMs (500ms), finalize utterance automatically
        debounceTimerRef.current = setTimeout(() => {
          finalizeTurn();
        }, debounceMs);
      }
    },
    [debounceMs, finalizeTurn],
  );

  const cancelPendingTurn = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingUtteranceRef.current = null;
  }, []);

  return {
    processSpeechResult,
    cancelPendingTurn,
  };
}
