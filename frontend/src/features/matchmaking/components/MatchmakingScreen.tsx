'use client';

import { useMatchmaking } from '../hooks/useMatchmaking';
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';
import { useAiHelperStore } from '@/stores/aiHelperStore';
import { cn } from '@/lib/utils/cn';

// SVG ring constants
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MatchmakingScreen() {
  const { status, waitingSince, partnerName, error, startMatchmaking, cancelMatchmaking, resetToIdle } =
    useMatchmaking();
  const { secondsRemaining, progress } = useMatchmakingTimer(
    status === 'waiting' ? waitingSince : null,
  );
  const { isPreCallEnabled, setPreCallEnabled } = useAiHelperStore();

  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* ── IDLE / CANCELLED ── */}
      {(status === 'idle' || status === 'cancelled') && (
        <div className="animate-fade-in flex flex-col items-center gap-6 text-center max-w-sm w-full">
          <div>
            <div className="w-20 h-20 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-600/30">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Find a Language Partner</h1>
            <p className="mt-1 text-sm text-zinc-500">
              You'll be matched with a real speaker in seconds.
              {status === 'cancelled' && <span className="block mt-1 text-zinc-400">Search cancelled.</span>}
            </p>
          </div>

          {/* ── AI Reply Suggestions Preference Card ── */}
          <div className="w-full bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-sm text-left transition-all hover:border-zinc-300">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900">AI Reply Suggestions</span>
                    <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                      Gemini
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Real-time smart prompts when your partner speaks</p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isPreCallEnabled}
                onClick={() => setPreCallEnabled(!isPreCallEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  isPreCallEnabled ? 'bg-purple-600' : 'bg-zinc-200',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    isPreCallEnabled ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          </div>

          <button
            onClick={startMatchmaking}
            className="w-full py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-semibold text-sm transition-all duration-150 shadow-md shadow-brand-600/25"
          >
            Find Partner
          </button>
        </div>
      )}

      {/* ── WAITING ── */}
      {status === 'waiting' && (
        <div className="animate-fade-in flex flex-col items-center gap-6 text-center">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#e4e4e7" strokeWidth={8} />
              <circle
                cx="60" cy="60" r={RADIUS} fill="none"
                stroke="#4f46e5" strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-zinc-900">{secondsRemaining}</span>
              <span className="text-xs text-zinc-400 font-medium">seconds</span>
            </div>
          </div>
          <div>
            <p className="font-semibold text-zinc-800 text-lg">Searching for a partner…</p>
            <p className="text-sm text-zinc-400 mt-1">
              {isPreCallEnabled ? 'AI Suggestions active • Connecting you automatically' : "You'll be connected automatically"}
            </p>
          </div>
          <button
            onClick={cancelMatchmaking}
            className="px-5 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-600 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── MATCHED ── */}
      {status === 'matched' && (
        <div className="animate-scale-in flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-zinc-900">Match Found!</p>
            {partnerName && (
              <p className="text-sm text-zinc-500 mt-1">
                Connecting you with <span className="font-medium text-zinc-700">{partnerName}</span>…
              </p>
            )}
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn('w-2 h-2 rounded-full bg-brand-500 animate-pulse-soft')}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── TIMEOUT ── */}
      {status === 'timeout' && (
        <div className="animate-fade-in flex flex-col items-center gap-6 text-center max-w-xs">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-zinc-800 text-lg">No partner found</p>
            <p className="text-sm text-zinc-500 mt-1">Nobody was available in the last 30 seconds. Try again!</p>
          </div>
          <button
            onClick={resetToIdle}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── ERROR ── */}
      {status === 'error' && (
        <div className="animate-fade-in flex flex-col items-center gap-6 text-center max-w-xs">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-zinc-800">Something went wrong</p>
            <p className="text-sm text-zinc-500 mt-1">{error || 'Please try again.'}</p>
          </div>
          <button
            onClick={resetToIdle}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
