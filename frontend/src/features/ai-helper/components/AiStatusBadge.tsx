'use client';

import { cn } from '@/lib/utils/cn';

interface AiStatusBadgeProps {
  isGenerating: boolean;
  onDisable: () => void;
}

export function AiStatusBadge({ isGenerating, onDisable }: AiStatusBadgeProps) {
  return (
    <div className="flex items-center gap-2 bg-purple-950/60 border border-purple-500/30 px-2.5 py-1 rounded-full backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        <span className={cn('w-2 h-2 rounded-full bg-purple-400', isGenerating ? 'animate-ping' : 'animate-pulse')} />
        <span className="text-[11px] font-semibold text-purple-200">
          AI Helper {isGenerating ? 'active…' : 'on'}
        </span>
      </div>
      <button
        onClick={onDisable}
        title="Disable AI for this call"
        className="text-[10px] text-zinc-400 hover:text-red-400 transition-colors ml-1 pl-1.5 border-l border-purple-800"
      >
        Turn off
      </button>
    </div>
  );
}
