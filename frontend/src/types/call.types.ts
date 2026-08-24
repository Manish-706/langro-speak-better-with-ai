export type CallStatus =
  | 'idle'
  | 'waiting_peer'
  | 'connecting'
  | 'connected'
  | 'partner_ended'
  | 'partner_disconnected'
  | 'ended'
  | 'failed';

export interface CallState {
  status: CallStatus;
  roomId: string | null;
  partnerId: string | null;
  partnerName: string | null;
  cameraEnabled: boolean;
  micEnabled: boolean;
  // Actions
  setConnecting: (roomId: string, partnerId: string, partnerName: string) => void;
  setConnected: () => void;
  setPartnerEnded: () => void;
  setPartnerDisconnected: () => void;
  setEnded: () => void;
  setFailed: () => void;
  toggleCamera: () => void;
  toggleMic: () => void;
  reset: () => void;
}

// WebRTC signaling payloads
export interface OfferPayload { offer: RTCSessionDescriptionInit }
export interface AnswerPayload { answer: RTCSessionDescriptionInit }
export interface IceCandidatePayload { candidate: RTCIceCandidateInit }
export interface CallStartPayload { shouldOffer: boolean; roomId: string }
