// Shape of Deepgram's own /v1/auth/grant response (their naming, not ours).
export interface DeepgramGrantResponse {
  access_token: string;
  expires_in: number;
}

// Shape WE return to the frontend — matches DeepgramTokenResponse in the
// frontend's deepgram.types.ts.
export interface DeepgramTokenDto {
  token: string;
  expiresInSeconds: number;
}
