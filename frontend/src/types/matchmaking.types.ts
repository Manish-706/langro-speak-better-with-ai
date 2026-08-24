export type MatchmakingStatus = 'idle' | 'waiting' | 'matched' | 'timeout' | 'cancelled' | 'error';

export interface MatchFoundPayload {
  roomId: string;
  partnerId: string;
  partnerName: string;
}

export interface MatchmakingState {
  status: MatchmakingStatus;
  waitingSince: number | null;
  roomId: string | null;
  partnerId: string | null;
  partnerName: string | null;
  error: string | null;
  // Actions
  setWaiting: (since: number) => void;
  setMatched: (payload: MatchFoundPayload) => void;
  setIdle: () => void;
  setTimedOut: () => void;
  setCancelled: () => void;
  setError: (message: string) => void;
  clearError: () => void;
}
