import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

const variantClasses = {
  primary:
    'bg-gray-900 text-white hover:bg-gray-700 active:bg-gray-800 disabled:bg-gray-400',
  secondary:
    'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
          'transition-colors duration-150 focus-ring',
          'disabled:cursor-not-allowed',
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {isLoading && <Spinner size="sm" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
