import { create } from 'zustand';
import type { AuthState, User } from '@/types/auth.types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as true — session check happens on mount

  setUser: (user: User) =>
    set({ user, isAuthenticated: true, isLoading: false }),

  clearAuth: () =>
    set({ user: null, isAuthenticated: false, isLoading: false }),

  setLoading: (loading: boolean) =>
    set({ isLoading: loading }),
}));
