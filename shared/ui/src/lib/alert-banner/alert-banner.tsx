import React from 'react';
import { cva, type VariantProps, cn } from '@one-exam-monorepo/utils';

const alertBannerVariants = cva('mb-6 rounded-md p-4', {
  variants: {
    type: {
      error: 'bg-red-50 border border-red-200',
      success: 'bg-green-50 border border-green-200',
      warning: 'bg-yellow-50 border border-yellow-200',
      info: 'bg-blue-50 border border-blue-200',
    },
  },
  defaultVariants: {
    type: 'info',
  },
});

const alertTextVariants = cva('text-sm', {
  variants: {
    type: {
      error: 'text-red-700',
      success: 'text-green-700',
      warning: 'text-yellow-700',
      info: 'text-blue-700',
    },
  },
  defaultVariants: {
    type: 'info',
  },
});

interface AlertBannerProps extends VariantProps<typeof alertBannerVariants> {
  message: string;
  className?: string;
}

export function AlertBanner({
  type = 'info',
  message,
  className,
}: AlertBannerProps) {
  return (
    <div className={cn(alertBannerVariants({ type }), className)}>
      <div className={cn(alertTextVariants({ type }))}>{message}</div>
    </div>
  );
}
