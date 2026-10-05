'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { RollCallRow, type RollCallEntry } from '@/components/console/roll-call-row'
import { RollCallQueue, type SessionOp } from '@/lib/roll-call-queue'
import { canPublishSession, filterRosterEntries, countUnsetStudents } from '@/lib/roll-call-helpers'
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

    // 1. Optimistic state updates for all matched students
    setEntries((prev) =>
      prev.map((e) => {
        const sId = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
        if (studentIds.includes(sId)) {
          return { ...e, attendance: 'P' }
        }
        return e
      }),
    )

    // 2. Push batch ops into queue
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
    // 1. Optimistic local update
    setEntries((prev) =>
      prev.map((e) => {
        const sid = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
        return sid === studentId ? { ...e, attendance } : e
      }),
    )

    // 2. Queue dispatch
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
    // Rule R1: fills only Not Set (null) entries
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

  const filteredEntries = filterRosterEntries(entries, {
    query: searchQuery,
    recitedOnly,
  })

  const unsetCount = countUnsetStudents(entries)
  const barrierCheck = canPublishSession(entries)

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Session Title & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-surface-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-text uppercase tracking-wider">
              {subject.code} {subject.sectionMark}
            </span>
            <Badge
              variant={
                session._status === 'published'
                  ? 'success'
                  : 'neutral'
              }
            >
              {session._status === 'published' ? 'Published' : 'Draft Roll Call'}
            </Badge>
          </div>
          <h1 className="text-lg font-bold text-text-primary mt-1">
            {subject.name}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Session Date: {session.date}
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {pendingSyncCount > 0 ? (
            <Badge variant="warning" className="flex items-center gap-1.5 py-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Syncing ({pendingSyncCount})</span>
            </Badge>
          ) : (
            <Badge variant="success" className="flex items-center gap-1.5 py-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Saved</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or number..."
            className="w-full h-11 pl-9 pr-3 rounded-lg border border-border bg-surface-1 text-sm text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand min-h-[44px]"
          />
        </div>

        <Button
          type="button"
          variant={recitedOnly ? 'primary' : 'secondary'}
          size="default"
          onClick={() => setRecitedOnly(!recitedOnly)}
          className="shrink-0 text-xs font-semibold"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Recited
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="default"
          onClick={() => setZoomDrawerOpen(true)}
          className="shrink-0 text-xs font-semibold"
        >
          <Video className="h-3.5 w-3.5 mr-1.5" />
          Zoom
        </Button>
      </div>

      {/* Student List */}
      <div className="flex flex-col gap-2">
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
          <div className="text-center py-10 rounded-xl border border-dashed border-border bg-surface-1 text-xs text-text-tertiary">
            No students match your filter
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 border-t border-border bg-surface-1/95 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            size="default"
            onClick={handleMarkAllPresent}
            disabled={unsetCount === 0}
            className="text-xs font-semibold"
          >
            Mark all Present ({unsetCount} unset)
          </Button>

          <Button
            type="button"
            variant="primary"
            size="default"
            onClick={handleOpenPublish}
            className="text-xs font-semibold"
          >
            Publish Session
          </Button>
        </div>
      </div>

      {/* Rule R1 Barrier Modal: Unset Students Alert */}
      <BottomSheet
        open={barrierModalOpen}
        onClose={() => setBarrierModalOpen(false)}
        title="Cannot Publish Session (Rule R1)"
        description="All active enrolled students must be marked Present, Absent, or Excused before this session can be published."
      >
        <div className="flex flex-col gap-3 py-2">
          <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {barrierCheck.unsetCount} student(s) remain Not Set:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {barrierCheck.unsetStudentNames.slice(0, 5).map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
                {barrierCheck.unsetStudentNames.length > 5 && (
                  <li>...and {barrierCheck.unsetStudentNames.length - 5} more</li>
                )}
              </ul>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => {
              handleMarkAllPresent()
              setBarrierModalOpen(false)
            }}
            className="mt-2 w-full"
          >
            Mark Remaining Present & Continue
          </Button>
        </div>
      </BottomSheet>

      {/* Publish Confirmation Modal with Mandatory Change Note */}
      <BottomSheet
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Publish Session to Classmates"
        description="This will make attendance and recitations visible to classmates and professors. A change note is required."
      >
        <div className="flex flex-col gap-4 py-2">
          {publishError && (
            <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger">
              {publishError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="changeNote" className="text-xs font-medium text-text-secondary select-none">
                Change Note (Mandatory)
              </label>
              <button
                type="button"
                onClick={handleSuggestChangeNote}
                disabled={suggestingNote}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-text hover:underline disabled:opacity-50 min-h-[32px] px-1"
              >
                <Sparkles className="h-3 w-3" />
                {suggestingNote ? 'Generating...' : '✨ Suggest note'}
              </button>
            </div>
            <input
              id="changeNote"
              type="text"
              required
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="e.g. Regular class roll call / verified lab attendance"
              className="h-11 min-h-[44px] rounded-lg border border-border bg-surface-2 px-3 text-sm text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <Button
            type="button"
            variant="primary"
            loading={publishing}
            onClick={handleConfirmPublish}
            className="mt-2 w-full font-medium"
          >
            Confirm & Publish
          </Button>
        </div>
      </BottomSheet>

      {/* Zoom Match Assistant Drawer */}
      <ZoomMatchDrawer
        open={zoomDrawerOpen}
        onClose={() => setZoomDrawerOpen(false)}
        roster={rosterList}
        onApplyMatches={handleApplyZoomMatches}
      />
    </div>
  )
}
