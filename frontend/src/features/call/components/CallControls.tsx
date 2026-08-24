'use client';

import { cn } from '@/lib/utils/cn';

interface CallControlsProps {
  cameraOn: boolean;
  micOn: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onEndCall: () => void;
  aiActive?: boolean;
  onDisableAi?: () => void;
  disabled?: boolean;
}

export function CallControls({
  cameraOn,
  micOn,
  onToggleCamera,
  onToggleMic,
  onEndCall,
  aiActive,
  onDisableAi,
  disabled,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Mic toggle */}
      <ControlButton
        on={micOn}
        onClick={onToggleMic}
        disabled={disabled}
        label={micOn ? 'Mute' : 'Unmute'}
        activeIcon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        }
        inactiveIcon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        }
      />

      {/* End call */}
      <button
        onClick={onEndCall}
        disabled={disabled}
        aria-label="End call"
        className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-all disabled:opacity-50"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
        </svg>
      </button>

      {/* Camera toggle */}
      <ControlButton
        on={cameraOn}
        onClick={onToggleCamera}
        disabled={disabled}
        label={cameraOn ? 'Stop Video' : 'Start Video'}
        activeIcon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
        }
        inactiveIcon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
          </svg>
        }
      />

      {/* Optional AI disable toggle if AI is active */}
      {aiActive && onDisableAi && (
        <button
          onClick={onDisableAi}
          disabled={disabled}
          title="Turn off AI Suggestions"
          aria-label="Disable AI Suggestions"
          className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-950/80 border border-purple-500/40 text-purple-300 hover:bg-purple-900 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        </button>
      )}
    </div>
  );
}

interface ControlButtonProps {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
}

function ControlButton({ on, onClick, disabled, label, activeIcon, inactiveIcon }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50',
        on
          ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800',
      )}
    >
      {on ? activeIcon : inactiveIcon}
    </button>
  );
}
