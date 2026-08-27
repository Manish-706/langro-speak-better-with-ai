'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { DeepgramSpeechProvider } from '../speech/deepgram-speech.provider';
import type { SpeechProvider, SpeechResult } from '../speech/speechProvider.interface';

interface UseSpeechRecognitionOptions {
  enabled: boolean;
  audioTrack?: MediaStreamTrack | null;
  mediaStream?: MediaStream | null;
  callId: string;
  onSpeechResult: (result: SpeechResult) => void;
}

export function useSpeechRecognition({
  enabled,
  audioTrack,
  mediaStream,
  callId,
  onSpeechResult,
}: UseSpeechRecognitionOptions) {
  const providerRef = useRef<SpeechProvider | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const onSpeechResultRef = useRef(onSpeechResult);
  const callIdRef = useRef(callId);
  callIdRef.current = callId;

  useEffect(() => {
    onSpeechResultRef.current = onSpeechResult;
  }, [onSpeechResult]);

  useEffect(() => {
    const provider = new DeepgramSpeechProvider();
    providerRef.current = provider;

    if (!provider.isSupported()) {
      setIsSupported(false);
      return;
    }

    provider.onResult((result) => onSpeechResultRef.current(result));
    provider.onError((err) => console.warn('[STT] error:', err.error, err.message));
    provider.onEnd(() => console.log('[STT] connection ended'));

    return () => {
      provider.stop();
      providerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const provider = providerRef.current;
    if (!provider || !provider.isSupported()) return;

    const audioSource = mediaStream || audioTrack;

    if (!enabled || !audioSource) {
      provider.stop();
      return;
    }

    const currentCallId = callIdRef.current;
    provider.start(audioSource, { callId: currentCallId });
  }, [enabled, audioTrack, mediaStream, callId]);

  const stopRecognition = useCallback(() => {
    providerRef.current?.stop();
  }, []);

  return { isSupported, stopRecognition };
}
