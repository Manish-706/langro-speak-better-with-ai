'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface VideoTileProps {
  stream: MediaStream | null;
  muted?: boolean;
  label?: string;
  className?: string;
  placeholder?: React.ReactNode;
  mirrored?: boolean;
}

export function VideoTile({ stream, muted = false, label, className, placeholder, mirrored = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch((err) => {
        console.warn('[VideoTile] play() prevented:', err);
      });
    }
  }, [stream]);

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-zinc-900 flex items-center justify-center', className)}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={cn('w-full h-full object-cover', mirrored && 'scale-x-[-1]')}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {placeholder ?? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center shadow-inner">
                <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              {label && <span className="text-zinc-400 text-sm font-medium">{label}</span>}
            </div>
          )}
        </div>
      )}

      {label && stream && (
        <div className="absolute bottom-3 left-3 z-10">
          <span className="text-[11px] font-medium text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
