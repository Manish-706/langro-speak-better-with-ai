import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account — Langro',
  description: 'Create your free Langro account.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
