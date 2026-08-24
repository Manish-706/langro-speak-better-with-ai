'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAiHelperStore } from '@/stores/aiHelperStore';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useTurnDetection } from './useTurnDetection';
import { getSocket } from '@/lib/socket/socket';
import type { AiSuggestionsPayload } from '@/types/ai-helper.types';

interface UseAiHelperOptions {
  roomId: string;
  userId: string;
  partnerId: string;
  isCallConnected: boolean;
  localStream: MediaStream | null;
  // NOTE: remoteStream is no longer used here — remote-track recognition
  // was removed after confirming Chrome's InvalidStateError on WebRTC
  // remote tracks. Each browser now only transcribes its OWN mic; the
  // partner's words reach this session via the backend broadcast/routing
  // instead of local remote-track STT.
}

export function useAiHelper({
  roomId,
  userId,
  partnerId,
  isCallConnected,
  localStream,
}: UseAiHelperOptions) {
  const store = useAiHelperStore();
  const socket = getSocket();

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

    // NEW: call-wide broadcasts — fire regardless of whether THIS user
    // personally opted in. This is what lets a non-opted-in partner's
    // browser know it should still be transcribing its own mic.
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

  // ── Turn complete → emit MY OWN finalized speech ────────────────────
  // This is always self-speech now (no remote-track path). The backend
  // decides, from the authenticated socket identity, whether this feeds
  // the sender's own context, the partner's suggestion trigger, or both.
  const handleTurnComplete = useCallback(
    (speakerId: string, text: string) => {
      const state = useAiHelperStore.getState();

      // NOTE: this now checks isHelperActiveForCall, not isPreCallEnabled —
      // a non-opted-in user must still send their own speech as text so
      // their opted-in partner's session gets proper context/triggers.
      if (!state.isHelperActiveForCall) return;
      if (!roomId || !text.trim()) return;

      sequenceRef.current += 1;
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      console.log(`[useAiHelper] 🎙 Sending my own speech: "${text}"`);

      // REMOVED: the old "if (speakerId === partnerId) setIsGenerating(true)"
      // branch — it no longer applies. This client only ever sends its OWN
      // speech, so it never knows locally when a suggestion request has
      // been triggered on the backend for it. isGenerating is left to be
      // driven only by actually receiving ai:suggestions (see setSuggestions).
      // A proper "generating..." indicator would need a new backend event
      // (e.g. ai:generating) fired when this user's partner's speech
      // triggers generation — worth adding later if wanted, not required
      // for the feature to work.

      socket.emit('ai:transcript', {
        callId: roomId,
        speakerId, // always userId now; backend derives real identity from the socket, not this field
        text,
        isFinal: true,
        sequence: sequenceRef.current,
        timestamp: Date.now(),
        requestId,
      });
    },
    [roomId, socket],
  );

  const { processSpeechResult, cancelPendingTurn } = useTurnDetection({
    onTurnComplete: handleTurnComplete,
    debounceMs: 400,
  });

  // ── My own speech → turn detection ──────────────────────────────────
  const handleLocalSpeechResult = useCallback(
    (result: { transcript: string; isFinal: boolean }) => {
      if (!userId) return;
      processSpeechResult(userId, result.transcript, result.isFinal);
    },
    [userId, processSpeechResult],
  );

  // REMOVED: handleRemoteSpeechResult entirely — no more remote-track STT.

  // ── Whether THIS user has personally opted out ──────────────────────
  // Respected as a hard stop on transcribing this user's own voice, even
  // if the helper is still active for the call because the partner opted
  // in. "I turned AI off" is treated as "stop listening to me," not just
  // "stop showing me suggestions."
  const thisUserOptedOut =
    store.aiMode === 'pre_call_disabled' || store.aiMode === 'disabled_permanently';

  // ── Should THIS browser run local STT at all? ────────────────────────
  // Runs whenever the call-wide helper is active and this user hasn't
  // explicitly refused — regardless of whether this specific user is the
  // one who opted in. This is the key behavior change from before.
  const shouldRunLocalStt =
    isCallConnected && store.isHelperActiveForCall && !thisUserOptedOut;

  const isAiActive = isCallConnected && store.isPreCallEnabled && store.aiMode !== 'disabled_permanently';

  const { isSupported, stopRecognition } = useSpeechRecognition({
    enabled: shouldRunLocalStt && !!localAudioTrack,
    audioTrack: localAudioTrack,
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
    cancelPendingTurn();
    useAiHelperStore.getState().disablePermanently();
    socket.emit('ai:disable', { callId: roomId });
  }, [stopRecognition, cancelPendingTurn, socket, roomId]);

  // ── Cleanup ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopRecognition();
      cancelPendingTurn();
      enabledCallIdRef.current = null;
    };
  }, [stopRecognition, cancelPendingTurn]);

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