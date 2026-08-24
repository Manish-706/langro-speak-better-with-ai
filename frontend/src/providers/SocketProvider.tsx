'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { connectSocket, disconnectSocket } from '@/lib/socket/socket';

/**
 * Manages the Socket.IO connection lifecycle.
 * Connects when authenticated, disconnects when auth is cleared.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      connectSocket();
    } else if (!isLoading && !isAuthenticated) {
      disconnectSocket();
    }
    return () => {
      // Don't disconnect on unmount — AuthProvider lives for the session lifetime
    };
  }, [isAuthenticated, isLoading]);

  return <>{children}</>;
}
