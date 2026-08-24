import { create } from 'zustand';
import type { CallState } from '@/types/call.types';

export const useCallStore = create<CallState>((set) => ({
  status: 'idle',
  roomId: null,
  partnerId: null,
  partnerName: null,
  cameraEnabled: true,
  micEnabled: true,

  setConnecting: (roomId, partnerId, partnerName) =>
    set({ status: 'connecting', roomId, partnerId, partnerName }),

  setConnected: () =>
    set({ status: 'connected' }),

  setPartnerEnded: () =>
    set({ status: 'partner_ended' }),

  setPartnerDisconnected: () =>
    set({ status: 'partner_disconnected' }),

  setEnded: () =>
    set({ status: 'ended' }),

  setFailed: () =>
    set({ status: 'failed' }),

  toggleCamera: () =>
    set((s) => ({ cameraEnabled: !s.cameraEnabled })),

  toggleMic: () =>
    set((s) => ({ micEnabled: !s.micEnabled })),

  reset: () =>
    set({
      status: 'idle',
      roomId: null,
      partnerId: null,
      partnerName: null,
      cameraEnabled: true,
      micEnabled: true,
    }),
}));
