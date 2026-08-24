'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket/socket';
import type { CallStartPayload, OfferPayload, AnswerPayload, IceCandidatePayload } from '@/types/call.types';

interface UseCallSocketOptions {
  roomId: string;
  onCallStart: (payload: CallStartPayload) => void;
  onOffer: (payload: OfferPayload) => void;
  onAnswer: (payload: AnswerPayload) => void;
  onIceCandidate: (payload: IceCandidatePayload) => void;
  onPartnerEnded: () => void;
  onPartnerDisconnected: () => void;
}

export function useCallSocket({
  roomId,
  onCallStart,
  onOffer,
  onAnswer,
  onIceCandidate,
  onPartnerEnded,
  onPartnerDisconnected,
}: UseCallSocketOptions) {
  const socket = getSocket();

  // Keep latest callbacks in refs to prevent stale closure issues
  const callbacksRef = useRef({
    onCallStart,
    onOffer,
    onAnswer,
    onIceCandidate,
    onPartnerEnded,
    onPartnerDisconnected,
  });

  // Update ref synchronously on every render before effects run
  useEffect(() => {
    callbacksRef.current = {
      onCallStart,
      onOffer,
      onAnswer,
      onIceCandidate,
      onPartnerEnded,
      onPartnerDisconnected,
    };
  });

  useEffect(() => {
    if (!roomId) return;

    const handleCallStart = (payload: CallStartPayload) => callbacksRef.current.onCallStart(payload);
    const handleOffer = (payload: OfferPayload) => callbacksRef.current.onOffer(payload);
    const handleAnswer = (payload: AnswerPayload) => callbacksRef.current.onAnswer(payload);
    const handleIceCandidate = (payload: IceCandidatePayload) => callbacksRef.current.onIceCandidate(payload);
    const handlePartnerEnded = () => callbacksRef.current.onPartnerEnded();
    const handlePartnerDisconnected = () => callbacksRef.current.onPartnerDisconnected();

    // IMPORTANT: Register ALL listeners BEFORE emitting call:ready.
    // On fast (localhost) connections the server may reply with call:start
    // before the listener registration line if emit runs first.
    socket.on('call:start', handleCallStart);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('call:partner-ended', handlePartnerEnded);
    socket.on('call:partner-disconnected', handlePartnerDisconnected);

    // Signal readiness to the server AFTER listeners are set up
    socket.emit('call:ready', { roomId });

    return () => {
      socket.off('call:start', handleCallStart);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('call:partner-ended', handlePartnerEnded);
      socket.off('call:partner-disconnected', handlePartnerDisconnected);
    };
  }, [roomId, socket]);

  const sendOffer = useCallback(
    (offer: RTCSessionDescriptionInit) => socket.emit('webrtc:offer', { roomId, offer }),
    [socket, roomId],
  );

  const sendAnswer = useCallback(
    (answer: RTCSessionDescriptionInit) => socket.emit('webrtc:answer', { roomId, answer }),
    [socket, roomId],
  );

  const sendIceCandidate = useCallback(
    (candidate: RTCIceCandidateInit) => socket.emit('webrtc:ice-candidate', { roomId, candidate }),
    [socket, roomId],
  );

  const endCall = useCallback(() => {
    socket.emit('call:end', { roomId });
  }, [socket, roomId]);

  return { sendOffer, sendAnswer, sendIceCandidate, endCall };
}
