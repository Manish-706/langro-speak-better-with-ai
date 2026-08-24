'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useLogin } from '../hooks/useLogin';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Card } from '@/components/ui/Card';
import type { ApiError } from '@/types/auth.types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const apiError = error as ApiError | null;
  const apiErrorMessage = apiError
    ? (typeof apiError.message === 'string' ? apiError.message : apiError.message?.join(', '))
    : null;

  const onSubmit = (values: LoginFormValues) => {
    mutate(values);
  };

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Sign in to Langro</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back. Enter your credentials to continue.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          id="login-email"
          label="Email address"
          type="email"
          placeholder="jane@example.com"
          autoComplete="email"
          error={errors.email?.message}
          disabled={isPending}
          {...register('email')}
        />

        <div className="relative flex flex-col gap-1">
          <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              autoComplete="current-password"
              disabled={isPending}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className={[
                'w-full rounded-md border px-3 py-2 pr-10 text-sm text-gray-900',
                'placeholder:text-gray-400 bg-white',
                'transition-colors duration-150 focus-ring',
                'disabled:cursor-not-allowed disabled:opacity-60',
                errors.password
                  ? 'border-red-400 focus-visible:outline-red-400'
                  : 'border-gray-300 focus-visible:outline-gray-500',
              ].join(' ')}
              {...register('password')}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" role="alert" className="text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        {apiErrorMessage && <FormError message={apiErrorMessage} />}

        <Button
          id="login-submit"
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          className="mt-1 w-full"
        >
          {isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600">
          Create one
        </Link>
      </p>
    </Card>
  );
}
