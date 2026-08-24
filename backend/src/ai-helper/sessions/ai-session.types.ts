export type AiState = 'pre_call_enabled' | 'pre_call_disabled' | 'active' | 'disabled_permanently';

export interface AiSession {
  callId: string;
  userId: string;
  partnerId: string;
  chatSession: any;
  state: AiState;
  generationInFlight: boolean;
  lastRequestId?: string;
  generationVersion: number;
  createdAt: number;
}
