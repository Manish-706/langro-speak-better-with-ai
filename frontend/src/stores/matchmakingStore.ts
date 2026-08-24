import { create } from 'zustand';
import type { MatchmakingState, MatchFoundPayload } from '@/types/matchmaking.types';

export const useMatchmakingStore = create<MatchmakingState>((set) => ({
  status: 'idle',
  waitingSince: null,
  roomId: null,
  partnerId: null,
  partnerName: null,
  error: null,

  setWaiting: (since: number) =>
    set({ status: 'waiting', waitingSince: since, error: null }),

  setMatched: (payload: MatchFoundPayload) =>
    set({
      status: 'matched',
      roomId: payload.roomId,
      partnerId: payload.partnerId,
      partnerName: payload.partnerName,
      error: null,
    }),

  setIdle: () =>
    set({ status: 'idle', waitingSince: null, roomId: null, partnerId: null, partnerName: null, error: null }),

  setTimedOut: () =>
    set({ status: 'timeout', waitingSince: null }),

  setCancelled: () =>
    set({ status: 'cancelled', waitingSince: null }),

  setError: (message: string) =>
    set({ status: 'error', error: message }),

  clearError: () =>
    set({ error: null }),
}));
