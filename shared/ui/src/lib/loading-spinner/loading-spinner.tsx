import React from 'react';
import { cva, type VariantProps, cn } from '@one-exam-monorepo/utils';

const loadingSpinnerVariants = cva('animate-spin rounded-full border-b-2', {
  variants: {
    size: {
      sm: 'h-4 w-4 border-b-1',
      md: 'h-8 w-8 border-b-2',
      lg: 'h-12 w-12 border-b-2',
      xl: 'h-16 w-16 border-b-2',
      '2xl': 'h-32 w-32 border-b-2',
    },
    color: {
      primary: 'border-blue-600',
      secondary: 'border-gray-600',
      success: 'border-green-600',
      danger: 'border-red-600',
      warning: 'border-yellow-600',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'primary',
  },
});

const loadingContainerVariants = cva('flex items-center justify-center', {
  variants: {
    fullScreen: {
      true: 'min-h-screen',
      false: '',
    },
  },
  defaultVariants: {
    fullScreen: false,
  },
});

interface LoadingSpinnerProps
  extends VariantProps<typeof loadingSpinnerVariants> {
  fullScreen?: boolean;
  className?: string;
  containerClassName?: string;
}

export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  fullScreen = false,
  className,
  containerClassName,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        loadingContainerVariants({ fullScreen }),
        containerClassName
      )}
    >
      <div className={cn(loadingSpinnerVariants({ size, color }), className)} />
    </div>
  );
}
