import { create } from 'zustand';
import type { AiHelperState } from '@/types/ai-helper.types';

export const useAiHelperStore = create<AiHelperState>((set, get) => ({
  aiMode: 'pre_call_enabled',
  isPreCallEnabled: true,
  isHelperActiveForCall: false,
  suggestions: [],
  isGenerating: false,
  lastRequestId: null,

  setPreCallEnabled: (enabled: boolean) =>
    set({
      isPreCallEnabled: enabled,
      aiMode: enabled ? 'pre_call_enabled' : 'pre_call_disabled',
    }),

  setActive: () =>
    set({
      aiMode: 'active',
    }),

  setHelperActiveForCall: (active: boolean) =>
    set({
      isHelperActiveForCall: active,
    }),
  disablePermanently: () =>
    set({
      aiMode: 'disabled_permanently',
      suggestions: [],
      isGenerating: false,
    }),

  setSuggestions: (suggestions: string[], requestId: string) =>
    set({
      suggestions,
      lastRequestId: requestId,
      isGenerating: false,
    }),

  clearSuggestions: () =>
    set({
      suggestions: [],
      isGenerating: false,
    }),

  setIsGenerating: (generating: boolean) =>
    set({
      isGenerating: generating,
    }),

  reset: () =>
    set((state) => ({
      suggestions: [],
      isGenerating: false,
      lastRequestId: null,
      aiMode: state.isPreCallEnabled ? 'pre_call_enabled' : 'pre_call_disabled',
      // DO NOT flip isPreCallEnabled back to true if the user turned it off!
      isPreCallEnabled: state.isPreCallEnabled,
    })),
}));
