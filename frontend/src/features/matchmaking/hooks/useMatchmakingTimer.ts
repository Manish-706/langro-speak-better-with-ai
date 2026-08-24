import { useState, useEffect } from 'react';

const TIMEOUT_SECONDS = 30;

interface TimerResult {
  secondsElapsed: number;
  secondsRemaining: number;
  progress: number; // 0–1
  isExpired: boolean;
}

export function useMatchmakingTimer(waitingSince: number | null): TimerResult {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!waitingSince) return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [waitingSince]);

  if (!waitingSince) {
    return { secondsElapsed: 0, secondsRemaining: TIMEOUT_SECONDS, progress: 0, isExpired: false };
  }

  const elapsed = Math.floor((now - waitingSince) / 1000);
  const secondsElapsed = Math.min(elapsed, TIMEOUT_SECONDS);
  const secondsRemaining = Math.max(0, TIMEOUT_SECONDS - secondsElapsed);
  const progress = secondsElapsed / TIMEOUT_SECONDS;
  const isExpired = secondsElapsed >= TIMEOUT_SECONDS;

  return { secondsElapsed, secondsRemaining, progress, isExpired };
}
