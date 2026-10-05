import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonVariantsArgs {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function buttonVariants({
  variant = 'primary',
  size = 'default',
}: ButtonVariantsArgs = {}): string {
  const base =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]'

  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-brand-hover shadow-sm',
    secondary: 'bg-surface-2 text-text-primary border border-border hover:bg-hover',
    outline: 'border border-border text-text-primary hover:bg-hover bg-transparent',
    destructive: 'bg-destructive text-on-brand hover:opacity-90',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-hover',
  }

  const sizes = {
    default: 'h-11 px-4 py-2 text-sm min-h-[44px]',
    sm: 'h-9 px-3 text-xs min-h-[36px]',
    lg: 'h-12 px-6 text-base min-h-[48px]',
    icon: 'h-11 w-11 min-h-[44px] min-w-[44px] p-0',
  }

  return cn(base, variants[variant], sizes[size])
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantsArgs {
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin motion-reduce:animate-none -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
