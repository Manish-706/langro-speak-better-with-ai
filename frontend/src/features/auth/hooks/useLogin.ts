import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { loginApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import type { LoginPayload, ApiError } from '@/types/auth.types';

export function useLogin() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<Awaited<ReturnType<typeof loginApi>>, ApiError, LoginPayload>({
    mutationFn: loginApi,
    onSuccess: ({ user }) => {
      setUser(user);
      router.push('/dashboard');
    },
  });
}
