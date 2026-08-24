'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useRegister } from '../hooks/useRegister';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Card } from '@/components/ui/Card';
import type { ApiError } from '@/types/auth.types';

const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, 'Password must contain at least one letter and one number'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate, isPending, error } = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const apiError = error as ApiError | null;
  const apiErrorMessage = apiError
    ? (typeof apiError.message === 'string' ? apiError.message : apiError.message?.join(', '))
    : null;

  const onSubmit = (values: RegisterFormValues) => {
    mutate(values);
  };

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Start improving your language skills today.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          id="register-name"
          label="Full name"
          type="text"
          placeholder="Jane Doe"
          autoComplete="name"
          error={errors.name?.message}
          disabled={isPending}
          {...register('name')}
        />

        <Input
          id="register-email"
          label="Email address"
          type="email"
          placeholder="jane@example.com"
          autoComplete="email"
          error={errors.email?.message}
          disabled={isPending}
          {...register('email')}
        />

        <div className="relative flex flex-col gap-1">
          <label htmlFor="register-password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 chars, 1 letter and 1 number"
              autoComplete="new-password"
              disabled={isPending}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'register-password-error' : undefined}
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
            <p id="register-password-error" role="alert" className="text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        {apiErrorMessage && <FormError message={apiErrorMessage} />}

        <Button
          id="register-submit"
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          className="mt-1 w-full"
        >
          {isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
