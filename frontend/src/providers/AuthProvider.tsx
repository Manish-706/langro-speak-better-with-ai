'use client';

import { useEffect } from 'react';
import { getMeApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/stores/authStore';

/**
 * Runs a single /auth/me check when the app mounts to determine
 * whether an existing HTTP-only cookie session is still valid.
 * The server is always the source of truth for auth state.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearAuth } = useAuthStore();

  useEffect(() => {
    getMeApi()
      .then((user) => setUser(user))
      .catch(() => clearAuth());
  }, [setUser, clearAuth]);

  return <>{children}</>;
}
