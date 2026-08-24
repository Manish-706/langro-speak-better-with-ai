import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { registerApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import type { RegisterPayload, ApiError } from '@/types/auth.types';

export function useRegister() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<Awaited<ReturnType<typeof registerApi>>, ApiError, RegisterPayload>({
    mutationFn: registerApi,
    onSuccess: ({ user }) => {
      setUser(user);
      router.push('/dashboard');
    },
  });
}
