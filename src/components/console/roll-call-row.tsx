'use client'

import * as React from 'react'
import { Plus, Minus, FileText } from 'lucide-react'
import { SegmentedToggle, type PresenceState } from '@/components/ui/segmented-toggle'
import { cn } from '@/lib/utils'

export interface RollCallStudent {
  id: string
  name: string
  studentNumber?: string
  hasConflict?: boolean
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
  const attendance = entry.attendance

  // Semantic row visual rhythm per ADR 0013 and Impeccable craft floor (clean 1px perimeter border)
  const statusStyles = React.useMemo(() => {
    switch (attendance) {
      case 'P':
        return 'border-emerald-500/25 bg-emerald-500/[0.04] hover:border-emerald-500/40'
      case 'A':
        return 'border-rose-500/30 bg-rose-500/[0.04] hover:border-rose-500/50'
      case 'E':
        return 'border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-500/50'
      case 'C':
        return 'border-purple-500/30 bg-purple-500/[0.04] hover:border-purple-500/50'
      default:
        return 'border-amber-500/25 border-dashed bg-surface-1/70 hover:bg-surface-1'
    }
  }, [attendance])

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border transition-colors shadow-xs',
        statusStyles,
      )}
    >
      {/* Student Info */}
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            'flex items-center justify-center h-7 w-7 rounded-lg text-xs font-mono font-semibold shrink-0',
            attendance === 'P'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : attendance === 'A'
                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold'
                : attendance === 'E'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  : attendance === 'C'
                    ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400'
                    : 'bg-surface-2 text-text-tertiary',
          )}
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm sm:text-base font-semibold text-text-primary tracking-tight truncate">
              {entry.student.name}
            </span>

            {/* Attendance Status Badge for quick glance */}
            {attendance === 'A' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                Absent
              </span>
            )}
            {attendance === 'E' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Excused
              </span>
            )}
            {attendance === 'C' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                Conflict
              </span>
            )}
            {attendance == null && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Not set
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap">
            {entry.student.studentNumber && (
              <span className="font-mono">{entry.student.studentNumber}</span>
            )}
            {entry.excuseReason && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                <FileText className="h-3 w-3" />
                {entry.excuseReason}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls: Segmented Attendance Toggle + Recitation Stepper */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
        <SegmentedToggle
          value={entry.attendance}
          onChange={onAttendanceChange}
          className="shrink-0"
        />

        {/* Recitation Counter */}
        <div className="flex items-center gap-0.5 bg-surface-2 border border-border rounded-lg p-0.5 shrink-0">
          <button
            type="button"
            aria-label={`Decrease recitations for ${entry.student.name}`}
            disabled={recitations <= 0}
            onClick={() => onRecitationAdjust(-1)}
            className="inline-flex items-center justify-center min-h-[42px] sm:min-h-[44px] min-w-[30px] sm:min-w-[36px] text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none rounded transition-colors active:scale-95"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span
            className={cn(
              'min-w-[20px] text-center text-xs font-bold tabular-nums',
              recitations > 0 ? 'text-brand-text' : 'text-text-quaternary',
            )}
          >
            {recitations}
          </span>
          <button
            type="button"
            aria-label={`Increase recitations for ${entry.student.name}`}
            onClick={() => onRecitationAdjust(1)}
            className="inline-flex items-center justify-center min-h-[42px] sm:min-h-[44px] min-w-[30px] sm:min-w-[36px] text-text-secondary hover:text-text-primary rounded transition-colors active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
