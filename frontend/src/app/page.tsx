import { redirect } from 'next/navigation';

/**
 * Root page redirects to /dashboard.
 * The dashboard layout handles the auth check and redirects
 * unauthenticated users to /login.
 */
export default function RootPage() {
  redirect('/dashboard');
}
