'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card } from '@/components/ui/Card';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
      <Card>
        <p className="text-sm text-gray-500 mb-4">
          Profile preferences (language level, goals, interests) will be added in Phase 3.
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-500 w-20 shrink-0">Name</dt>
            <dd className="text-gray-900">{user?.name ?? '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-20 shrink-0">Email</dt>
            <dd className="text-gray-900">{user?.email ?? '—'}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
