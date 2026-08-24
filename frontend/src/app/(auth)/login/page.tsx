import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In — Langro',
  description: 'Sign in to your Langro account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
