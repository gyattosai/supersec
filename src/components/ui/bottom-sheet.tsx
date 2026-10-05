'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Prevent background body scroll when open on mobile
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'bottom-sheet-title' : undefined}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-overlay backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up Container */}
      <div
        className={cn(
          'relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-t-2xl border-t border-border bg-surface-1 p-5 shadow-3 z-10 overflow-y-auto animate-in slide-in-from-bottom duration-200',
          className,
        )}
      >
        {/* Drag handle */}
        <div className="w-10 h-1.5 rounded-full bg-border-strong mx-auto mb-4 shrink-0" />

        {/* Header */}
        {(title || description) && (
          <div className="mb-4">
            {title && (
              <h2 id="bottom-sheet-title" className="text-base font-semibold text-text-primary tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-text-secondary mt-1">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
