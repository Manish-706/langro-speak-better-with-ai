import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logoutApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import type { ApiError } from '@/types/auth.types';

export function useLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation<{ message: string }, ApiError>({
    mutationFn: logoutApi,
    onSuccess: () => {
      clearAuth();
      router.push('/login');
    },
    onError: () => {
      // Even if server returns error, clear local auth state
      clearAuth();
      router.push('/login');
    },
  });
}
