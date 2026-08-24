'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils/cn';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navLinks = [
    { href: '/dashboard', label: 'Home' },
    { href: '/matchmaking', label: 'Find Partner' },
    { href: '/profile', label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 gap-4">
          <Link href="/dashboard" className="text-base font-bold text-zinc-900 shrink-0">
            Langro
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  pathname === link.href || (link.href !== '/dashboard' && pathname?.startsWith(link.href))
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center">
                  <span className="text-brand-700 font-semibold text-xs">
                    {user.name[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-zinc-600 font-medium">{user.name.split(' ')[0]}</span>
              </div>
            )}
            <button
              id="logout-button"
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
            >
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
