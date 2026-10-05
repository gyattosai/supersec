import * as React from 'react'
import { cn } from '@/lib/utils'

export type PresenceState = 'P' | 'A' | 'E' | 'C' | null

export function getSegmentedButtonClass(value: PresenceState, selected: PresenceState): string {
  const base =
    'flex-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-sm font-semibold rounded-md border transition-all select-none active:scale-95 focus:outline-none focus:ring-1 focus:ring-ring'

  if (value === selected) {
    if (value === 'P') return cn(base, 'bg-success/20 text-success border-success/40 shadow-sm')
    if (value === 'A') return cn(base, 'bg-danger/20 text-danger border-danger/40 shadow-sm')
    if (value === 'E') return cn(base, 'bg-warning/20 text-warning border-warning/40 shadow-sm')
    if (value === 'C') return cn(base, 'bg-brand/20 text-brand border-brand/40 shadow-sm')
    return cn(base, 'bg-surface-3 text-text-primary border-border-strong shadow-sm')
  }

  return cn(base, 'bg-surface-2 text-text-tertiary border-border hover:bg-hover hover:text-text-secondary')
}

export interface SegmentedToggleProps {
  value: PresenceState
  onChange: (value: PresenceState) => void
  disabled?: boolean
  className?: string
}

export function SegmentedToggle({
  value,
  onChange,
  disabled = false,
  className,
}: SegmentedToggleProps) {
  const options: Array<{ label: string; val: PresenceState; ariaLabel: string }> = [
    { label: 'P', val: 'P', ariaLabel: 'Present' },
    { label: 'A', val: 'A', ariaLabel: 'Absent' },
    { label: 'E', val: 'E', ariaLabel: 'Excused' },
    { label: 'C', val: 'C', ariaLabel: 'With Schedule Conflict' },
    { label: '–', val: null, ariaLabel: 'Not set' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Attendance presence"
      className={cn('inline-flex items-center gap-1.5 p-1 rounded-lg bg-surface-1 border border-border', className)}
    >
      {options.map((opt) => (
        <button
          key={opt.label}
          type="button"
          role="radio"
          aria-checked={value === opt.val}
          aria-label={opt.ariaLabel}
          disabled={disabled}
          onClick={() => onChange(opt.val)}
          className={getSegmentedButtonClass(opt.val, value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
