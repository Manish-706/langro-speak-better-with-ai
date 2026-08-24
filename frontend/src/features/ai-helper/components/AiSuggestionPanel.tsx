'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface AiSuggestionPanelProps {
  suggestions: string[];
  isGenerating: boolean;
  onDismiss: () => void;
}

export function AiSuggestionPanel({
  suggestions,
  isGenerating,
  onDismiss,
}: AiSuggestionPanelProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isGenerating && suggestions.length === 0) {
    return null;
  }

  const handleCopy = (text: string, index: number) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    }
  };

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-30 pointer-events-none">
      <div className="animate-slide-up bg-zinc-900/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-3 shadow-2xl shadow-purple-950/50 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-purple-300">AI Suggested Replies</span>
            {isGenerating && (
              <span className="text-[11px] text-purple-400/80 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping inline-block" />
                Thinking…
              </span>
            )}
          </div>
          <button
            onClick={onDismiss}
            aria-label="Dismiss suggestions"
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded-md hover:bg-zinc-800"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Suggestion list */}
        <div className="space-y-1.5">
          {suggestions.map((text, idx) => (
            <button
              key={idx}
              onClick={() => handleCopy(text, idx)}
              className={cn(
                'w-full text-left p-2.5 rounded-xl border transition-all duration-150 flex items-start justify-between gap-3 group',
                copiedIndex === idx
                  ? 'bg-purple-900/40 border-purple-500/60 text-purple-100'
                  : 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700/60 hover:border-purple-500/40 text-zinc-100',
              )}
            >
              <p className="text-xs md:text-sm font-medium leading-relaxed flex-1">
                "{text}"
              </p>
              <span className="shrink-0 text-[10px] text-zinc-400 group-hover:text-purple-300 px-1.5 py-0.5 rounded bg-zinc-900/50 border border-zinc-700/50 mt-0.5">
                {copiedIndex === idx ? 'Copied ✓' : 'Click to copy'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
