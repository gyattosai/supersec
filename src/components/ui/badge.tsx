import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeVariantsArgs {
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral'
}

export function badgeVariants({ variant = 'neutral' }: BadgeVariantsArgs = {}): string {
  const base =
    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border select-none transition-colors'

  const variants = {
    brand: 'bg-brand-tint text-brand-text border-brand/20',
    success: 'bg-success/15 text-success border-success/20',
    warning: 'bg-warning/15 text-warning border-warning/20',
    danger: 'bg-danger/15 text-danger border-danger/20',
    neutral: 'bg-surface-3 text-text-secondary border-border',
  }

  return cn(base, variants[variant])
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    BadgeVariantsArgs {}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
