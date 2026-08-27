export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

export interface DeepgramAlternative {
  transcript: string;
  confidence?: number;
  words?: DeepgramWord[];
}

export interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

export interface DeepgramStreamingResult {
  type?: string;
  channel?: DeepgramChannel;
  is_final?: boolean;
  speech_final?: boolean;
  duration?: number;
  start?: number;
  from_finalize?: boolean;
}

export interface DeepgramTokenResponse {
  token: string;
  expiresInSeconds: number;
}

export interface DeepgramTokenError {
  message: string;
}