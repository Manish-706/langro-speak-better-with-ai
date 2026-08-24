import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-sm text-gray-500">Page not found.</p>
      <Link href="/dashboard">
        <Button variant="secondary">Go to Dashboard</Button>
      </Link>
    </div>
  );
}
