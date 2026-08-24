import { useAuthStore } from '@/stores/authStore';

/**
 * Convenience hook for auth state.
 * Components should import this instead of useAuthStore directly.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return { user, isAuthenticated, isLoading, setUser, clearAuth };
}
