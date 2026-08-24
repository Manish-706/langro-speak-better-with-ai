'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserWebSpeechProvider } from '../speech/web-speech.provider';
import type {
  SpeechProvider,
  SpeechResult,
} from '../speech/speech-provider.interface';

interface UseSpeechRecognitionOptions {
  enabled: boolean;
  audioTrack?: MediaStreamTrack | null;
  onSpeechResult: (result: SpeechResult) => void;
}

export function useSpeechRecognition({
  enabled,
  audioTrack,
  onSpeechResult,
}: UseSpeechRecognitionOptions) {
  const providerRef = useRef<SpeechProvider | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Keep latest callback without recreating the provider.
  const onSpeechResultRef = useRef(onSpeechResult);

  useEffect(() => {
    onSpeechResultRef.current = onSpeechResult;
  }, [onSpeechResult]);

  // Create speech provider once.
  useEffect(() => {
    console.log('[STT] 🎤 Initializing speech recognition provider...');

    const provider = new BrowserWebSpeechProvider();
    providerRef.current = provider;

    const supported = provider.isSupported();

    console.log('[STT] 🎤 Supported:', supported);

    if (!supported) {
      setIsSupported(false);
      return;
    }

    provider.onResult((result) => {
      console.log(
        `[STT] 📝 Result: isFinal=${result.isFinal} | "${result.transcript}"`,
      );

      onSpeechResultRef.current(result);
    });

    provider.onError((err) => {
      console.warn(
        '[STT] ❌ Error:',
        err.error,
        err.message,
      );
    });

    provider.onEnd(() => {
      console.log('[STT] ⏹ Recognition ended');
    });

    return () => {
      console.log('[STT] 🛑 Cleanup: stopping recognition');
      provider.stop();
      providerRef.current = null;
    };
  }, []);

  // Start / stop recognition whenever enabled or audio source changes.
  useEffect(() => {
    const provider = providerRef.current;

    console.log(
      '[STT] enabled:',
      enabled,
      '| provider:',
      !!provider,
      '| audioTrack:',
      !!audioTrack,
    );

    if (!provider || !provider.isSupported()) {
      return;
    }

    if (!enabled) {
      console.log('[STT] 🔴 Stopping recognition');
      provider.stop();
      return;
    }

    // AI is enabled but the required audio source isn't available yet.
    if (!audioTrack) {
      console.log(
        '[STT] ⏳ Waiting for audio track before starting recognition...',
      );
      provider.stop();
      return;
    }

    console.log(
      '[STT] 🟢 Starting recognition on provided audio track...',
    );

    provider.start(audioTrack, {
      language: 'en-US',
      continuous: true,
      interimResults: true,
    });
  }, [enabled, audioTrack]);

  const stopRecognition = useCallback(() => {
    console.log('[STT] ⏹ stopRecognition() called');
    providerRef.current?.stop();
  }, []);

  return {
    isSupported,
    stopRecognition,
  };
}