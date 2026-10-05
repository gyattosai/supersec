'use client'

import * as React from 'react'
import { Plus, Minus } from 'lucide-react'
import { SegmentedToggle, type PresenceState } from '@/components/ui/segmented-toggle'
import { cn } from '@/lib/utils'

export interface RollCallStudent {
  id: string
  name: string
  studentNumber?: string
}

export interface RollCallEntry {
  student: RollCallStudent
  attendance: PresenceState
  recitations?: number
  excuseReason?: string
}

export interface RollCallRowProps {
  index: number
  entry: RollCallEntry
  onAttendanceChange: (attendance: PresenceState) => void
  onRecitationAdjust: (delta: number) => void
}

export function RollCallRow({
  index,
  entry,
  onAttendanceChange,
  onRecitationAdjust,
}: RollCallRowProps) {
  const recitations = entry.recitations || 0

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-surface-1 shadow-1">
      {/* Student Info */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center justify-center h-6 w-6 rounded-md bg-surface-2 text-[11px] font-semibold text-text-tertiary shrink-0">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {entry.student.name}
          </p>
          {entry.student.studentNumber && (
            <p className="text-[11px] text-text-tertiary truncate">
              {entry.student.studentNumber}
            </p>
          )}
        </div>
      </div>

      {/* Controls: Segmented Attendance Toggle + Recitation Stepper */}
      <div className="flex items-center gap-3 shrink-0">
        <SegmentedToggle
          value={entry.attendance}
          onChange={onAttendanceChange}
        />

        {/* Recitation Counter */}
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1">
          <button
            type="button"
            aria-label={`Decrease recitations for ${entry.student.name}`}
            disabled={recitations <= 0}
            onClick={() => onRecitationAdjust(-1)}
            className="inline-flex items-center justify-center min-h-[44px] min-w-[36px] text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none rounded transition-colors active:scale-95"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span
            className={cn(
              'min-w-[24px] text-center text-xs font-bold tabular-nums',
              recitations > 0 ? 'text-brand-text' : 'text-text-quaternary',
            )}
          >
            {recitations}
          </span>
          <button
            type="button"
            aria-label={`Increase recitations for ${entry.student.name}`}
            onClick={() => onRecitationAdjust(1)}
            className="inline-flex items-center justify-center min-h-[44px] min-w-[36px] text-text-secondary hover:text-text-primary rounded transition-colors active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
