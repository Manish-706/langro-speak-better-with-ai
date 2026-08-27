export interface SpeechResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

export interface SpeechError {
  error: string;
  message: string;
}

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  callId?: string;
}

export interface SpeechProvider {
  isSupported(): boolean;

  start(
    audioSource?: MediaStreamTrack | MediaStream | null,
    options?: SpeechRecognitionOptions,
  ): void;

  stop(): void;

  onResult(cb: (result: SpeechResult) => void): void;

  onError(cb: (error: SpeechError) => void): void;

  onEnd(cb: () => void): void;
}