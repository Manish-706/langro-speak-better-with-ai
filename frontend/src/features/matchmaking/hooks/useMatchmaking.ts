'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMatchmakingStore } from '@/stores/matchmakingStore';
import { joinMatchmakingApi, cancelMatchmakingApi } from '@/lib/api/matchmaking.api';
import { getSocket } from '@/lib/socket/socket';
import type { MatchFoundPayload } from '@/types/matchmaking.types';

export function useMatchmaking() {
  const store = useMatchmakingStore();
  const router = useRouter();
  const listenersAttached = useRef(false);
  // Tracks whether a navigation to /call is in flight (prevents the reset below from firing)
  const navigatingRef = useRef(false);

  // On mount: if status is 'matched' and we're NOT mid-navigation, a previous call ended
  // and the user navigated back to /matchmaking manually. Reset to idle.
  useEffect(() => {
    if (store.status === 'matched' && !navigatingRef.current) {
      store.setIdle();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  // Attach socket event listeners once per component mount
  useEffect(() => {
    if (listenersAttached.current) return;
    listenersAttached.current = true;

    const socket = getSocket();

    const handleMatched = (payload: MatchFoundPayload) => {
      store.setMatched(payload);
      navigatingRef.current = true;
      // Brief delay for the "Match Found" animation, then navigate
      setTimeout(() => {
        router.push(`/call/${payload.roomId}`);
      }, 1200);
    };

    const handleTimeout = () => {
      store.setTimedOut();
    };

    const handleCancelled = () => {
      store.setCancelled();
    };

    socket.on('matchmaking:matched', handleMatched);
    socket.on('matchmaking:timeout', handleTimeout);
    socket.on('matchmaking:cancelled', handleCancelled);

    return () => {
      socket.off('matchmaking:matched', handleMatched);
      socket.off('matchmaking:timeout', handleTimeout);
      socket.off('matchmaking:cancelled', handleCancelled);
      listenersAttached.current = false;
    };
  }, [router, store]);

  const startMatchmaking = useCallback(async () => {
    store.clearError();
    try {
      await joinMatchmakingApi();
      store.setWaiting(Date.now());
    } catch (err: unknown) {
      const msg =
        (err as { message?: string }).message || 'Failed to start matchmaking. Try again.';
      store.setError(msg);
    }
  }, [store]);

  const cancelMatchmaking = useCallback(async () => {
    try {
      await cancelMatchmakingApi();
    } catch {
      getSocket().emit('matchmaking:cancel');
    } finally {
      store.setCancelled();
    }
  }, [store]);

  const resetToIdle = useCallback(() => {
    store.setIdle();
  }, [store]);

  return {
    status: store.status,
    waitingSince: store.waitingSince,
    partnerName: store.partnerName,
    error: store.error,
    startMatchmaking,
    cancelMatchmaking,
    resetToIdle,
  };
}
