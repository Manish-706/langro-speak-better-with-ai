'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAiHelperStore } from '@/stores/aiHelperStore';
import { useSpeechRecognition } from './useSpeechRecognition';
import { getSocket } from '@/lib/socket/socket';
import type { Socket } from 'socket.io-client';
import type { AiSuggestionsPayload } from '@/types/ai-helper.types';

interface UseAiHelperOptions {
  roomId: string;
  userId: string;
  isCallConnected: boolean;
  localStream: MediaStream | null;
}

export function useAiHelper({
  roomId,
  userId,
  isCallConnected,
  localStream,
}: UseAiHelperOptions) {
  const store = useAiHelperStore();
  const socketRef = useRef<Socket>(getSocket());
  const socket = socketRef.current;//

  const sequenceRef = useRef(0);
  const enabledCallIdRef = useRef<string | null>(null);
  const storeRef = useRef(store);

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  const localAudioTrack = localStream?.getAudioTracks()[0] ?? null;

  // ── Socket listeners ──────────────────────────────────────────────
  useEffect(() => {
    const onSuggestions = (data: AiSuggestionsPayload) => {
      console.log('[useAiHelper] 📥 Received suggestions:', data);
      storeRef.current.setSuggestions(data.suggestions ?? [], data.requestId);
    };

    const onEnabled = () => {
      console.log('[useAiHelper] ✅ AI enabled by server');
      storeRef.current.setActive();
    };

    const onDisabled = () => {
      console.log('[useAiHelper] ⏹ AI disabled by server');
      storeRef.current.disablePermanently();
    };

    const onHelperActiveForCall = (data: { callId: string }) => {
      if (data.callId !== roomId) return;
      console.log('[useAiHelper] 🌐 AI helper active for this call');
      storeRef.current.setHelperActiveForCall(true);
    };

    const onHelperInactiveForCall = (data: { callId: string }) => {
      if (data.callId !== roomId) return;
      console.log('[useAiHelper] 🌐 AI helper inactive for this call');
      storeRef.current.setHelperActiveForCall(false);
    };

    socket.on('ai:suggestions', onSuggestions);
    socket.on('ai:enabled', onEnabled);
    socket.on('ai:disabled', onDisabled);
    socket.on('ai:helper-active-for-call', onHelperActiveForCall);
    socket.on('ai:helper-inactive-for-call', onHelperInactiveForCall);

    return () => {
      socket.off('ai:suggestions', onSuggestions);
      socket.off('ai:enabled', onEnabled);
      socket.off('ai:disabled', onDisabled);
      socket.off('ai:helper-active-for-call', onHelperActiveForCall);
      socket.off('ai:helper-inactive-for-call', onHelperInactiveForCall);
    };
  }, [socket, roomId]);

  // ── Speech Recognition Result Handler ─────────────────────────────
  // Deepgram native VAD directly yields finalized sentences (isFinal: true).
  // We emit finalized turns directly without client-side debounce lag.
  const handleLocalSpeechResult = useCallback(
    (result: { transcript: string; isFinal: boolean }) => {
      if (!userId || !roomId) return;
      if (!result.transcript || !result.transcript.trim()) return;

      const state = useAiHelperStore.getState();
      if (!state.isHelperActiveForCall) return;

      if (result.isFinal) {
        const text = result.transcript.trim();
        sequenceRef.current += 1;
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        console.log(`[useAiHelper] 🎙️ Emitting finalized turn to server: "${text}"`);

        socket.emit('ai:transcript', {
          callId: roomId,
          speakerId: userId,
          text,
          isFinal: true,
          sequence: sequenceRef.current,
          timestamp: Date.now(),
          requestId,
        });
      }
    },
    [roomId, userId, socket],
  );

  const thisUserOptedOut =
    store.aiMode === 'pre_call_disabled' || store.aiMode === 'disabled_permanently';

  const shouldRunLocalStt =
    isCallConnected && store.isHelperActiveForCall && !thisUserOptedOut;

  const isAiActive =
    isCallConnected && store.isPreCallEnabled && store.aiMode !== 'disabled_permanently';

  const { isSupported, stopRecognition } = useSpeechRecognition({
    enabled: shouldRunLocalStt && !!localStream,
    mediaStream: localStream,
    audioTrack: localAudioTrack,
    callId: roomId,
    onSpeechResult: handleLocalSpeechResult,
  });

  // ── Enable AI session once the call is connected, if I opted in ──────
  useEffect(() => {
    if (!isCallConnected) return;
    if (enabledCallIdRef.current === roomId) return;

    const state = useAiHelperStore.getState();
    if (!state.isPreCallEnabled) return;

    enabledCallIdRef.current = roomId;
    console.log('[useAiHelper] 🚀 Enabling AI for call:', roomId);

    socket.emit('ai:enable', { callId: roomId, preCallEnabled: true });
  }, [isCallConnected, roomId, socket]);

  // ── Disable AI ────────────────────────────────────────────────────
  const disableAi = useCallback(() => {
    console.log('[useAiHelper] ⏹ Disabling AI');
    stopRecognition();
    useAiHelperStore.getState().disablePermanently();
    socket.emit('ai:disable', { callId: roomId });
  }, [stopRecognition, socket, roomId]);

  // ── Cleanup ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopRecognition();
      enabledCallIdRef.current = null;
      useAiHelperStore.getState().reset();
    };
  }, [stopRecognition]);

  return {
    aiMode: store.aiMode,
    isPreCallEnabled: store.isPreCallEnabled,
    isHelperActiveForCall: store.isHelperActiveForCall,
    isAiActive,
    suggestions: store.suggestions,
    isGenerating: store.isGenerating,
    isSupported,
    disableAi,
    clearSuggestions: store.clearSuggestions,
  };
}