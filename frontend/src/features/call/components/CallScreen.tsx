'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useCallStore } from '@/stores/callStore';
import { useMatchmakingStore } from '@/stores/matchmakingStore';
import { useAiHelperStore } from '@/stores/aiHelperStore';
import { VideoTile } from './VideoTile';
import { CallControls } from './CallControls';
import { AiSuggestionPanel } from '@/features/ai-helper/components/AiSuggestionPanel';
import { AiStatusBadge } from '@/features/ai-helper/components/AiStatusBadge';
import { useWebRTC } from '../webrtc/useWebRTC';
import { useCallSocket } from '../socket/useCallSocket';
import { useAiHelper } from '@/features/ai-helper/hooks/useAiHelper';
import { getSocket } from '@/lib/socket/socket';
import type { CallStartPayload } from '@/types/call.types';

interface CallScreenProps {
  roomId: string;
  partnerName: string;
}

export function CallScreen({ roomId, partnerName }: CallScreenProps) {
  const router = useRouter();
  const authStore = useAuthStore();
  const callStore = useCallStore();
  const matchmakingStore = useMatchmakingStore();
  const aiHelperStore = useAiHelperStore();

  const [testText, setTestText] = useState('');
  const [showTestBar, setShowTestBar] = useState(false);

  const shouldOfferRef = useRef<boolean | null>(null);
  const hasInitiatedRef = useRef<boolean>(false);

  // WebRTC hook
  const {
    localStream,
    remoteStream,
    mediaStatus,
    cameraOn,
    micOn,
    initiateCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleCamera,
    toggleMic,
    hangUp,
  } = useWebRTC({
    onSendOffer: (offer) => sendOffer(offer),
    onSendAnswer: (answer) => sendAnswer(answer),
    onSendIceCandidate: (c) => sendIceCandidate(c),
    onConnected: () => callStore.setConnected(),
    onFailed: () => callStore.setFailed(),
  });

  // Call Socket hook
  const { sendOffer, sendAnswer, sendIceCandidate, endCall } = useCallSocket({
    roomId,
    onCallStart: useCallback(
      ({ shouldOffer }: CallStartPayload) => {
        callStore.setConnecting(roomId, '', partnerName);
        shouldOfferRef.current = shouldOffer;

        if (shouldOffer && mediaStatus === 'ready' && !hasInitiatedRef.current) {
          hasInitiatedRef.current = true;
          initiateCall();
        }
      },
      [mediaStatus, roomId, partnerName, callStore, initiateCall],
    ),
    onOffer: handleOffer,
    onAnswer: handleAnswer,
    onIceCandidate: handleIceCandidate,
    onPartnerEnded: () => {
      callStore.setPartnerEnded();
    },
    onPartnerDisconnected: () => {
      callStore.setPartnerDisconnected();
    },
  });

  // Race condition resolution: If call:start arrived before media was ready
  useEffect(() => {
    if (mediaStatus === 'ready' && shouldOfferRef.current === true && !hasInitiatedRef.current) {
      hasInitiatedRef.current = true;
      initiateCall();
    }
  }, [mediaStatus, initiateCall]);

  const callStatus = callStore.status;
  const isConnected = callStatus === 'connected';
  const isCallActive = callStatus === 'connected' || callStatus === 'connecting' || callStatus === 'waiting_peer';

  // AI Helper integration
  const userId = authStore.user?.id || '';
  const partnerId = matchmakingStore.partnerId || callStore.partnerId || 'partner';

  const {
    isAiActive,
    suggestions,
    isGenerating,
    disableAi,
    clearSuggestions,
  } = useAiHelper({
    roomId,
    userId,
    partnerId,
    isCallConnected: isConnected,
    localStream,
    remoteStream
  });

  // Quick simulate partner prompt for instant verification
  const handleSendTestPrompt = (prompt: string) => {
    if (!prompt.trim()) return;
    const socket = getSocket();
    aiHelperStore.setIsGenerating(true);
    console.log('[CallScreen] 🚀 Sending test prompt to AI:', prompt);
    socket.emit('ai:transcript', {
      callId: roomId,
      speakerId: 'partner',
      text: prompt.trim(),
      isFinal: true,
      sequence: Date.now(),
      timestamp: Date.now(),
      requestId: `test_${Date.now()}`,
    });
    setTestText('');
  };

  // Return to dashboard on call end & clean up stores
  const handleEndCall = useCallback(() => {
    endCall();
    hangUp();
    callStore.setEnded();
    matchmakingStore.setIdle();
    aiHelperStore.reset();
    setTimeout(() => {
      callStore.reset();
      router.replace('/dashboard');
    }, 800);
  }, [endCall, hangUp, callStore, matchmakingStore, aiHelperStore, router]);

  // Clean up stores on unmount
  useEffect(() => {
    return () => {
      useMatchmakingStore.getState().setIdle();
      useAiHelperStore.getState().reset();
    };
  }, []);

  const partnerGone =
    callStatus === 'partner_ended' || callStatus === 'partner_disconnected';

  if (mediaStatus === 'denied') {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-zinc-950 flex items-center justify-center p-6 z-50">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-lg">Camera & Microphone Required</h2>
          <p className="text-zinc-400 text-sm mt-2">
            Langro needs access to your camera and microphone to start the call.
          </p>
          <button
            onClick={() => {
              matchmakingStore.setIdle();
              aiHelperStore.reset();
              router.replace('/dashboard');
            }}
            className="mt-6 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen h-[100dvh] overflow-hidden bg-zinc-950 flex flex-col select-none">
      {/* ── Top Header ── */}
      <header className="h-16 shrink-0 px-6 flex items-center justify-between z-20 border-b border-zinc-800/40 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-600/30">
            <span className="text-white text-xs font-bold">L</span>
          </div>
          <div>
            <p className="text-white/95 text-sm font-semibold tracking-tight">{partnerName}</p>
            <StatusBadge status={callStatus} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Helper Active Status Badge */}
          {isAiActive && (
            <AiStatusBadge
              isGenerating={isGenerating}
              onDisable={disableAi}
            />
          )}

          {/* Quick AI Test Trigger Button */}
          {isAiActive && (
            <button
              onClick={() => setShowTestBar((prev) => !prev)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-purple-900/40 border border-purple-500/40 text-purple-300 hover:bg-purple-800/50 transition-colors"
              title="Test AI prompt directly"
            >
              ✨ Test AI
            </button>
          )}
        </div>
      </header>

      {/* ── Quick AI Test Bar ── */}
      {showTestBar && isAiActive && (
        <div className="bg-purple-950/70 border-b border-purple-800/50 px-6 py-2 flex items-center gap-2 z-30 animate-slide-down">
          <span className="text-xs text-purple-300 font-medium shrink-0">Simulate Partner:</span>
          <button
            onClick={() => handleSendTestPrompt('How was your weekend?')}
            className="text-[11px] px-2 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/40"
          >
            "How was your weekend?"
          </button>
          <button
            onClick={() => handleSendTestPrompt('What do you like to do in your free time?')}
            className="text-[11px] px-2 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/40 hidden sm:inline-block"
          >
            "What do you like to do in your free time?"
          </button>
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendTestPrompt(testText)}
            placeholder="Or type partner utterance..."
            className="flex-1 bg-black/40 border border-purple-700/50 text-white text-xs px-2.5 py-1 rounded-md outline-none focus:border-purple-400"
          />
          <button
            onClick={() => handleSendTestPrompt(testText)}
            className="text-xs px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium"
          >
            Send
          </button>
        </div>
      )}

      {/* ── Main Video Stage ── */}
      <main className="flex-1 min-h-0 relative mx-4 my-2 rounded-3xl overflow-hidden bg-zinc-900 flex items-center justify-center border border-zinc-800/60 shadow-2xl">
        {/* Remote Video */}
        <VideoTile
          stream={remoteStream}
          label={partnerName}
          className="w-full h-full"
          placeholder={
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700/50 shadow-inner">
                <svg className="w-10 h-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <span className="text-zinc-400 text-sm font-medium animate-pulse-soft">
                {callStatus === 'connecting' || callStatus === 'waiting_peer' ? 'Connecting with partner…' : partnerName}
              </span>
            </div>
          }
        />

        {/* Local Video — Floating PiP Corner */}
        <div className="absolute bottom-4 right-4 w-40 sm:w-52 aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-700/80 z-20 transition-all hover:scale-105">
          <VideoTile
            stream={localStream}
            muted
            mirrored
            label="You"
            className="w-full h-full"
          />
        </div>
      </main>

      {/* ── Partner gone overlay ── */}
      {partnerGone && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md z-40">
          <div className="animate-scale-in bg-zinc-900 rounded-3xl p-8 max-w-xs w-full mx-4 text-center shadow-2xl border border-zinc-800">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 border border-zinc-700">
              <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg">
              {callStatus === 'partner_ended' ? 'Call ended' : 'Partner disconnected'}
            </h3>
            <p className="text-zinc-400 text-sm mt-2">
              {callStatus === 'partner_ended'
                ? `${partnerName} ended the call.`
                : `${partnerName} lost connection.`}
            </p>
            <button
              onClick={() => {
                hangUp();
                callStore.reset();
                matchmakingStore.setIdle();
                aiHelperStore.reset();
                router.replace('/dashboard');
              }}
              className="mt-6 w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-600/30"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ── AI Reply Suggestions Floating Overlay ── */}
      {isAiActive && (
        <AiSuggestionPanel
          suggestions={suggestions}
          isGenerating={isGenerating}
          onDismiss={clearSuggestions}
        />
      )}

      {/* ── Bottom Controls Bar ── */}
      <footer className="h-20 shrink-0 px-4 flex items-center justify-center z-20 pb-2">
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl px-6 py-2.5 shadow-2xl">
          <CallControls
            cameraOn={cameraOn}
            micOn={micOn}
            onToggleCamera={toggleCamera}
            onToggleMic={toggleMic}
            onEndCall={handleEndCall}
            aiActive={isAiActive}
            onDisableAi={disableAi}
            disabled={partnerGone || callStatus === 'ended'}
          />
        </div>
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    waiting_peer: { label: 'Waiting for partner…', color: 'text-amber-400' },
    connecting: { label: 'Connecting…', color: 'text-amber-400' },
    connected: { label: 'Connected', color: 'text-emerald-400' },
    failed: { label: 'Connection failed', color: 'text-red-400' },
    partner_ended: { label: 'Call ended', color: 'text-zinc-400' },
    partner_disconnected: { label: 'Partner disconnected', color: 'text-zinc-400' },
    ended: { label: 'Ended', color: 'text-zinc-400' },
  };
  const info = map[status] ?? { label: '', color: 'text-zinc-400' };
  return <span className={`text-[11px] font-medium ${info.color}`}>{info.label}</span>;
}
