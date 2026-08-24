'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {/* ── Welcome header ── */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-2 text-zinc-500">Ready to practice speaking today?</p>
      </div>

      {/* ── Primary CTA ── */}
      <Link href="/matchmaking" className="block group">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-700 p-6 shadow-xl shadow-brand-600/25 hover:shadow-brand-700/30 transition-all duration-300 hover:-translate-y-0.5">
          {/* Background decoration */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -right-4 w-28 h-28 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/70 text-xs font-medium uppercase tracking-wide">Live</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Find a Language Partner</h2>
              <p className="text-white/70 text-sm mt-1">Match with a real speaker in seconds</p>
            </div>
            <div className="shrink-0 ml-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-white/60 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            End-to-end encrypted video call • Up to 30s to find a match
          </div>
        </div>
      </Link>

      {/* ── Account info card ── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Your Account</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <span className="text-brand-700 font-bold text-lg">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900 truncate">{user?.name ?? '—'}</p>
            <p className="text-sm text-zinc-500 truncate">{user?.email ?? '—'}</p>
          </div>
        </div>
        <dl className="mt-4 pt-4 border-t border-zinc-50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-zinc-400 text-xs">Member since</dt>
            <dd className="text-zinc-700 font-medium mt-0.5">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
