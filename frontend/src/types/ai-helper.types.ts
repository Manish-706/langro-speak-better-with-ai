export type AiMode =
  | 'pre_call_enabled'
  | 'pre_call_disabled'
  | 'active'
  | 'disabled_permanently'
  | 'unsupported';

export interface TranscriptEvent {
  callId: string;
  speakerId: string;
  text: string;
  isFinal: boolean;
  sequence: number;
  timestamp: number;
  requestId?: string;
}

export interface AiSuggestionsPayload {
  requestId: string;
  suggestions: string[];
}

export interface AiHelperState {
  aiMode: AiMode;
  isPreCallEnabled: boolean;
  isHelperActiveForCall: boolean;
  suggestions: string[];
  isGenerating: boolean;
  lastRequestId: string | null;

  // Actions
  setPreCallEnabled: (enabled: boolean) => void;
  setActive: () => void;
  disablePermanently: () => void;
  setHelperActiveForCall: (active: boolean) => void; // NEW
  setSuggestions: (suggestions: string[], requestId: string) => void;
  clearSuggestions: () => void;
  setIsGenerating: (generating: boolean) => void;
  reset: () => void;
}
