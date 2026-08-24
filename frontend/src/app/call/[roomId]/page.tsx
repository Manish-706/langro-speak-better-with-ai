'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useMatchmakingStore } from '@/stores/matchmakingStore';
import { useCallStore } from '@/stores/callStore';
import { CallScreen } from '@/features/call/components/CallScreen';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Full-screen call page — outside the dashboard layout (no nav bar).
 * Requires authentication. Reads partner info from matchmakingStore.
 */
export default function CallPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const matchmakingStore = useMatchmakingStore();
  const callStore = useCallStore();

  const roomId = params?.roomId ?? '';
  const partnerName = matchmakingStore.partnerName ?? callStore.partnerName ?? 'Partner';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="call-screen min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!roomId) {
    router.replace('/dashboard');
    return null;
  }

  return <CallScreen roomId={roomId} partnerName={partnerName} />;
}
