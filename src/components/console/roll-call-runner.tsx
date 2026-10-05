'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Video, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { RollCallRow } from '@/components/console/roll-call-row'
import { RollCallQueue, type SessionOp } from '@/lib/roll-call-queue'
import {
  canPublishSession,
  filterRosterEntries,
  countUnsetStudents,
  calculateSessionLiveScore,
  type StatusFilterOption,
} from '@/lib/roll-call-helpers'
import { computeSessionDeltas } from '@/lib/ai/change-note'
import { ZoomMatchDrawer } from '@/components/console/zoom-match-drawer'
import { type PresenceState } from '@/components/ui/segmented-toggle'

export interface RollCallRunnerProps {
  session: {
    id: string
    date: string
    _status: string
    entries: any[]
  }
  subject: {
    id: string
    code: string
    name: string
    sectionMark?: string
  }
}

export function RollCallRunner({ session, subject }: RollCallRunnerProps) {
  const router = useRouter()
  const [entries, setEntries] = React.useState<any[]>(session.entries || [])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilterOption>('all')
  const [recitedOnly, setRecitedOnly] = React.useState(false)
  const [pendingSyncCount, setPendingSyncCount] = React.useState(0)

  // Publish modals
  const [publishModalOpen, setPublishModalOpen] = React.useState(false)
  const [barrierModalOpen, setBarrierModalOpen] = React.useState(false)
  const [changeNote, setChangeNote] = React.useState('')
  const [publishing, setPublishing] = React.useState(false)
  const [publishError, setPublishError] = React.useState<string | null>(null)
  const [suggestingNote, setSuggestingNote] = React.useState(false)
  const [zoomDrawerOpen, setZoomDrawerOpen] = React.useState(false)

  const initialEntriesRef = React.useRef<any[]>(session.entries || [])

  const studentNamesMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const e of entries) {
      const sId = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
      const sName = typeof e.student === 'object' && e.student !== null ? e.student.name : 'Unknown'
      map.set(sId, sName)
    }
    return map
  }, [entries])

  const handleSuggestChangeNote = async () => {
    setSuggestingNote(true)
    try {
      const deltas = computeSessionDeltas(initialEntriesRef.current, entries, studentNamesMap)
      const res = await fetch('/api/ai/change-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deltas }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.suggestion) {
        setChangeNote(data.suggestion)
      }
    } catch {
      // Graceful fallback
    } finally {
      setSuggestingNote(false)
    }
  }

  const rosterList = React.useMemo(() => {
    return entries.map((e) => {
      const sId = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
      const sName = typeof e.student === 'object' && e.student !== null ? e.student.name : 'Unknown'
      return { id: sId, name: sName }
    })
  }, [entries])

  const handleApplyZoomMatches = (studentIds: string[]) => {
    if (studentIds.length === 0) return

    setEntries((prev) =>
      prev.map((e) => {
        const sId = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
        if (studentIds.includes(sId)) {
          return { ...e, attendance: 'P' }
        }
        return e
      }),
    )

    studentIds.forEach((sId) => {
      queueRef.current?.enqueue({
        idempotencyKey: crypto.randomUUID(),
        type: 'set_attendance',
        studentId: sId,
        attendance: 'P',
      })
    })
    setPendingSyncCount(queueRef.current?.getPendingCount() || 0)
  }

  // Single-flight queue instance
  const queueRef = React.useRef<RollCallQueue | null>(null)

  React.useEffect(() => {
    const q = new RollCallQueue(session.id, {
      onSync: () => {
        setPendingSyncCount(q.getPendingCount())
      },
    })
    queueRef.current = q
    setPendingSyncCount(q.getPendingCount())
  }, [session.id])

  const handleAttendanceChange = (studentId: string, attendance: PresenceState) => {
    setEntries((prev) =>
      prev.map((e) => {
        const sid = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
        return sid === studentId ? { ...e, attendance } : e
      }),
    )

    const op: SessionOp = {
      idempotencyKey: crypto.randomUUID(),
      type: 'set_attendance',
      studentId,
      attendance,
    }
    queueRef.current?.enqueue(op)
    setPendingSyncCount(queueRef.current?.getPendingCount() || 0)
  }

  const handleRecitationAdjust = (studentId: string, delta: number) => {
    setEntries((prev) =>
      prev.map((e) => {
        const sid = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
        if (sid === studentId) {
          const nextCount = Math.max(0, (e.recitations || 0) + delta)
          return { ...e, recitations: nextCount }
        }
        return e
      }),
    )

    const op: SessionOp = {
      idempotencyKey: crypto.randomUUID(),
      type: 'adjust_recitation',
      studentId,
      delta,
    }
    queueRef.current?.enqueue(op)
    setPendingSyncCount(queueRef.current?.getPendingCount() || 0)
  }

  const handleMarkAllPresent = () => {
    setEntries((prev) =>
      prev.map((e) => (e.attendance == null ? { ...e, attendance: 'P' } : e)),
    )

    const op: SessionOp = {
      idempotencyKey: crypto.randomUUID(),
      type: 'mark_all_present',
    }
    queueRef.current?.enqueue(op)
    setPendingSyncCount(queueRef.current?.getPendingCount() || 0)
  }

  const handleOpenPublish = () => {
    setPublishError(null)
    const check = canPublishSession(entries)
    if (!check.canPublish) {
      setBarrierModalOpen(true)
    } else {
      setPublishModalOpen(true)
    }
  }

  const handleConfirmPublish = async () => {
    if (!changeNote.trim()) {
      setPublishError('Change note is mandatory when publishing a session (Rule R1)')
      return
    }

    setPublishing(true)
    setPublishError(null)

    try {
      const res = await fetch(`/api/sessions/${session.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeNote: changeNote.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to publish session')
      }

      setPublishModalOpen(false)
      router.refresh()
    } catch (err: any) {
      setPublishError(err?.message || 'Publishing failed')
    } finally {
      setPublishing(false)
    }
  }

  const filteredEntries = React.useMemo(() => {
    return filterRosterEntries(entries, {
      query: searchQuery,
      recitedOnly,
      statusFilter,
    })
  }, [entries, searchQuery, recitedOnly, statusFilter])

  const score = React.useMemo(() => calculateSessionLiveScore(entries), [entries])
  const barrierCheck = canPublishSession(entries)

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto pb-16">
      {/* Session Title & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border border-border bg-surface-1 shadow-sm">
        <div className="flex flex-col gap-1">
          <Link
            href={`/console/subjects/${subject.id}`}
            className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors mb-1 w-fit"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Back to {subject.code}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-text uppercase tracking-wider font-mono">
              {subject.code} {subject.sectionMark}
            </span>
            <Badge variant={session._status === 'published' ? 'success' : 'neutral'}>
              {session._status === 'published' ? 'Published' : 'Draft Roll Call'}
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-text-primary mt-0.5 tracking-tight">
            {subject.name}
          </h1>
          <p className="text-xs text-text-secondary">
            Session Date: <span className="font-mono font-semibold">{session.date}</span>
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {pendingSyncCount > 0 ? (
            <Badge variant="warning" className="flex items-center gap-1.5 py-1">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Syncing ({pendingSyncCount})</span>
            </Badge>
          ) : (
            <Badge variant="success" className="flex items-center gap-1.5 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Saved</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Sticky Top Roll Call Scoreboard (ADR 0013) */}
      <div className="sticky top-0 z-30 w-full px-3 sm:px-4 py-3 bg-canvas/95 backdrop-blur border border-border rounded-xl shadow-md flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Real-time Scoreboard Counters */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex flex-col shrink-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums text-text-primary tracking-tight">
                  {score.attendancePercentage}%
                </span>
                <span className="text-xs font-medium text-text-secondary">
                  Attendance
                </span>
              </div>
              <div className="w-32 h-1.5 bg-surface-2 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, score.attendancePercentage))}%` }}
                />
              </div>
            </div>

            {/* Presence breakdown pills */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {score.present} Present
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                {score.absent} Absent
              </span>
              {score.excused > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  {score.excused} Excused
                </span>
              )}
              {score.conflict > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                  {score.conflict} Conflict
                </span>
              )}
              {score.unset > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold animate-pulse">
                  {score.unset} Unset
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-surface-2 text-text-tertiary">
                  0 Unset
                </span>
              )}
            </div>
          </div>

          {/* Primary Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleMarkAllPresent}
              disabled={score.unset === 0}
              className="text-xs font-semibold min-h-[40px]"
            >
              Mark all Present {score.unset > 0 ? `(${score.unset})` : ''}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenPublish}
              className="text-xs font-semibold min-h-[40px] px-4"
            >
              Publish...
            </Button>
          </div>
        </div>

        {/* Status Filter Chips (ADR 0013) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-t border-border/60 pt-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
              statusFilter === 'all'
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface-2 text-text-secondary hover:text-text-primary'
            }`}
          >
            All ({score.total})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('unset')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
              statusFilter === 'unset'
                ? 'bg-orange-500 text-white font-bold shadow-sm'
                : score.unset > 0
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold'
                  : 'bg-surface-2 text-text-secondary hover:text-text-primary'
            }`}
          >
            Unset ({score.unset})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('absent')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
              statusFilter === 'absent'
                ? 'bg-rose-500 text-white font-bold shadow-sm'
                : 'bg-surface-2 text-text-secondary hover:text-text-primary'
            }`}
          >
            Absent ({score.absent})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('excused')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
              statusFilter === 'excused'
                ? 'bg-amber-500 text-black font-bold shadow-sm'
                : 'bg-surface-2 text-text-secondary hover:text-text-primary'
            }`}
          >
            Excused ({score.excused})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('present')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
              statusFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-surface-2 text-text-secondary hover:text-text-primary'
            }`}
          >
            Present ({score.present})
          </button>
        </div>
      </div>

      {/* Search & Tool Buttons */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or number..."
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-surface-1 text-sm text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand min-h-[44px]"
          />
        </div>

        <Button
          type="button"
          variant={recitedOnly ? 'primary' : 'secondary'}
          size="default"
          onClick={() => setRecitedOnly(!recitedOnly)}
          className="shrink-0 text-xs font-semibold rounded-xl min-h-[44px]"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Recited
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="default"
          onClick={() => setZoomDrawerOpen(true)}
          className="shrink-0 text-xs font-semibold rounded-xl min-h-[44px]"
        >
          <Video className="h-3.5 w-3.5 mr-1.5" />
          Zoom
        </Button>
      </div>

      {/* Student List */}
      <div className="flex flex-col gap-2.5">
        {filteredEntries.map((entry, idx) => {
          const studentId =
            typeof entry.student === 'object' && entry.student !== null
              ? entry.student.id
              : entry.student
          return (
            <RollCallRow
              key={studentId}
              index={idx}
              entry={entry}
              onAttendanceChange={(att) => handleAttendanceChange(studentId, att)}
              onRecitationAdjust={(delta) => handleRecitationAdjust(studentId, delta)}
            />
          )
        })}

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-surface-1 text-xs text-text-tertiary">
            No students match the current filter
          </div>
        )}
      </div>

      {/* Modals */}
      {/* 1. Rule R1 Barrier Modal */}
      <BottomSheet
        open={barrierModalOpen}
        onClose={() => setBarrierModalOpen(false)}
        title="Cannot Publish Session"
        description="Rule R1 requires all active students to have attendance marked before publishing."
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-xs font-medium leading-relaxed">
              There {barrierCheck.unsetCount === 1 ? 'is' : 'are'}{' '}
              <strong className="underline">{barrierCheck.unsetCount} student(s)</strong> marked
              as "Not set". Please set their attendance or use "Mark all Present".
            </p>
          </div>

          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto border border-border rounded-lg p-2 bg-surface-2/40">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              Students without attendance:
            </span>
            {barrierCheck.unsetStudentNames.map((name, i) => (
              <span key={i} className="text-xs text-text-primary py-0.5">
                • {name}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setBarrierModalOpen(false)
                handleMarkAllPresent()
              }}
              className="flex-1 text-xs font-semibold min-h-[44px]"
            >
              Mark all Present & Close
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setBarrierModalOpen(false)}
              className="flex-1 text-xs font-semibold min-h-[44px]"
            >
              Review Roster
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* 2. Publish Confirmation Modal */}
      <BottomSheet
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Publish Session Roll Call"
        description="Publishing creates an official version snapshot visible on public classmate pages."
      >
        <div className="flex flex-col gap-4 py-2">
          {publishError && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{publishError}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="changeNote" className="text-xs font-semibold text-text-primary">
                Change Note (Required) *
              </label>
              <button
                type="button"
                onClick={handleSuggestChangeNote}
                disabled={suggestingNote}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-text hover:underline disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                <span>{suggestingNote ? 'Generating...' : 'AI Suggest'}</span>
              </button>
            </div>
            <textarea
              id="changeNote"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="e.g. Initial roll call published, marked 42 present"
              className="w-full h-20 p-2.5 rounded-lg border border-border bg-surface-1 text-xs text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <p className="text-[11px] text-text-tertiary">
              Mandatory version comment explaining edits to students or professors.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPublishModalOpen(false)}
              disabled={publishing}
              className="text-xs font-semibold min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmPublish}
              disabled={publishing || !changeNote.trim()}
              className="text-xs font-semibold min-h-[44px]"
            >
              {publishing ? 'Publishing...' : 'Publish Version'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* 3. Zoom Matching Drawer */}
      <ZoomMatchDrawer
        open={zoomDrawerOpen}
        onClose={() => setZoomDrawerOpen(false)}
        roster={rosterList}
        onApplyMatches={handleApplyZoomMatches}
      />
    </div>
  )
}
