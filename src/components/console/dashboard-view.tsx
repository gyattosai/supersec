'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  MapPin,
  Inbox,
  Play,
  Ban,
  CheckCircle,
  ChevronRight,
  BookOpen,
  ExternalLink,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BottomSheet } from '@/components/ui/bottom-sheet'

export interface TodayClassItem {
  subject: {
    id: string
    code: string
    name: string
    sectionMark?: string
    room?: string
    zoomUrl?: string
  }
  slot: {
    weekday: string
    start: string
    end: string
  }
  existingSession?: {
    id: string
    _status: string
    kind?: string
    type?: string
  } | null
}

export interface SubjectOverviewItem {
  id: string
  code: string
  name: string
  sectionMark?: string
  professor?: string
  slug: string
  schedule: Array<{ weekday: string; start: string; end: string }>
  studentCount: number
}

export interface DashboardViewProps {
  todayDate: string
  todayClasses: TodayClassItem[]
  allSubjects?: SubjectOverviewItem[]
  pendingRequestsCount: number
  activeTermName?: string
}

export function DashboardView({
  todayDate,
  todayClasses,
  allSubjects = [],
  pendingRequestsCount,
  activeTermName,
}: DashboardViewProps) {
  const router = useRouter()
  const [startingSubjectId, setStartingSubjectId] = React.useState<string | null>(null)
  const [noClassModalOpen, setNoClassModalOpen] = React.useState(false)
  const [targetSubject, setTargetSubject] = React.useState<TodayClassItem | null>(null)
  const [noClassReason, setNoClassReason] = React.useState('')
  const [submittingNoClass, setSubmittingNoClass] = React.useState(false)

  const handleStartSession = async (item: TodayClassItem) => {
    if (item.existingSession) {
      router.push(`/console/session/${item.existingSession.id}`)
      return
    }

    try {
      setStartingSubjectId(item.subject.id)
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: item.subject.id,
          date: todayDate,
          startTime: item.slot.start,
          endTime: item.slot.end,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to start session')
      }

      const data = await res.json()
      router.push(`/console/session/${data.session.id}`)
    } catch (err: any) {
      alert(err?.message || 'Error starting session')
    } finally {
      setStartingSubjectId(null)
    }
  }

  const handleOpenNoClass = (item: TodayClassItem) => {
    setTargetSubject(item)
    setNoClassReason('')
    setNoClassModalOpen(true)
  }

  const handleConfirmNoClass = async () => {
    if (!targetSubject) return

    try {
      setSubmittingNoClass(true)
      const res = await fetch('/api/sessions/no-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: targetSubject.subject.id,
          date: todayDate,
          reason: noClassReason.trim() || undefined,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to mark no class')
      }

      setNoClassModalOpen(false)
      router.refresh()
    } catch (err: any) {
      alert(err?.message || 'Error marking no class')
    } finally {
      setSubmittingNoClass(false)
    }
  }

  const handleStartSessionForSubject = async (subj: SubjectOverviewItem) => {
    try {
      setStartingSubjectId(subj.id)
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: subj.id,
          date: todayDate,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to start session')
      }

      const data = await res.json()
      router.push(`/console/session/${data.session.id}`)
    } catch (err: any) {
      alert(err?.message || 'Error starting session')
    } finally {
      setStartingSubjectId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Pending Requests Banner */}
      {pendingRequestsCount > 0 && (
        <Link
          href="/console/requests"
          className="flex items-center justify-between p-3.5 rounded-xl border border-warning/30 bg-warning/10 text-text-primary hover:bg-warning/15 transition-colors shadow-1"
        >
          <div className="flex items-center gap-2.5">
            <Inbox className="h-4 w-4 text-warning shrink-0" />
            <span className="text-xs font-semibold">
              {pendingRequestsCount} pending classmate request{pendingRequestsCount > 1 ? 's' : ''} awaiting review
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-text-tertiary" />
        </Link>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Today&apos;s Classes
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {todayDate} {activeTermName ? `· ${activeTermName}` : ''}
          </p>
        </div>
      </div>

      {/* Class Cards */}
      <div className="flex flex-col gap-3">
        {todayClasses.map((item) => {
          const isNoClass = item.existingSession?.kind === 'noClass'
          const isPublished = item.existingSession?._status === 'published'
          const isLive = item.existingSession && !isNoClass && !isPublished
          const isStarting = startingSubjectId === item.subject.id

          return (
            <div
              key={item.subject.id}
              className="p-4 rounded-xl border border-border bg-surface-1 shadow-1 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-brand-text uppercase tracking-wider">
                      {item.subject.code} {item.subject.sectionMark}
                    </span>
                    {isNoClass ? (
                      <Badge variant="neutral">No Class</Badge>
                    ) : isPublished ? (
                      <Badge variant="success">Published</Badge>
                    ) : isLive ? (
                      <Badge variant="warning">In Progress</Badge>
                    ) : (
                      <Badge variant="neutral">Scheduled</Badge>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-text-primary">
                    {item.subject.name}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-text-secondary shrink-0 font-medium">
                  <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                  <span>
                    {item.slot.start} – {item.slot.end}
                  </span>
                </div>
              </div>

              {/* Room / Zoom details */}
              {(item.subject.room || item.subject.zoomUrl) && (
                <div className="flex items-center gap-3 text-xs text-text-tertiary">
                  {item.subject.room && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{item.subject.room}</span>
                    </div>
                  )}
                  {item.subject.zoomUrl && (
                    <a
                      href={item.subject.zoomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-text hover:underline"
                    >
                      Join Meeting
                    </a>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                {isNoClass ? (
                  <p className="text-xs text-text-tertiary italic">
                    Class cancelled for today
                  </p>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={isStarting}
                      onClick={() => handleStartSession(item)}
                      className="flex-1 text-xs font-semibold"
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      {item.existingSession ? 'Resume Roll Call' : 'Start Roll Call'}
                    </Button>

                    {!item.existingSession && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenNoClass(item)}
                        className="text-xs font-semibold text-text-secondary"
                      >
                        <Ban className="h-3.5 w-3.5 mr-1" />
                        No Class
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}

        {todayClasses.length === 0 && (
          <div className="rounded-xl border border-border bg-surface-1 p-5 text-center shadow-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-brand-text" />
              <p className="text-sm font-semibold text-text-primary">
                No scheduled meetings today
              </p>
            </div>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              None of your subjects meet on this weekday ({todayDate}). Your active subjects meet on Tuesday and Friday. You can still launch an unscheduled session or open any subject below.
            </p>
          </div>
        )}
      </div>

      {/* All Subjects Section */}
      {allSubjects && allSubjects.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-text-secondary" />
              <h2 className="text-base font-semibold text-text-primary">
                All Subjects
              </h2>
              <Badge variant="neutral" className="text-xs">
                {allSubjects.length}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allSubjects.map((subj) => (
              <div
                key={subj.id}
                className="p-4 rounded-xl border border-border bg-surface-1 shadow-1 flex flex-col justify-between gap-3 hover:border-border-hover transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-brand-text uppercase tracking-wider">
                      {subj.code} {subj.sectionMark ? `· ${subj.sectionMark}` : ''}
                    </span>
                    <Badge variant="neutral" className="text-[11px]">
                      {subj.studentCount} student{subj.studentCount === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {subj.name}
                  </h3>
                  {subj.professor && (
                    <p className="text-xs text-text-tertiary mt-0.5">
                      Prof. {subj.professor}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {subj.schedule.map((slot, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-surface-2 text-text-secondary border border-border"
                      >
                        <Clock className="h-3 w-3 text-text-tertiary" />
                        <span className="capitalize">{slot.weekday}</span> {slot.start}–{slot.end}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleStartSessionForSubject(subj)}
                    loading={startingSubjectId === subj.id}
                    className="flex-1 text-xs min-h-[44px]"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Start Session
                  </Button>
                  <Link
                    href={`/s/${subj.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg border border-border bg-surface-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors shrink-0"
                    title="Open public classmate view"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Public View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Class Reason Bottom Sheet */}
      <BottomSheet
        open={noClassModalOpen}
        onClose={() => setNoClassModalOpen(false)}
        title="Mark No Class"
        description={
          targetSubject
            ? `Cancel class for ${targetSubject.subject.code} on ${todayDate}.`
            : undefined
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="noClassReason" className="text-xs font-medium text-text-secondary">
              Reason (Optional)
            </label>
            <input
              id="noClassReason"
              type="text"
              value={noClassReason}
              onChange={(e) => setNoClassReason(e.target.value)}
              placeholder="e.g. Typhoon cancellation / Professor on leave"
              className="h-11 min-h-[44px] rounded-lg border border-border bg-surface-2 px-3 text-sm text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <Button
            type="button"
            variant="primary"
            loading={submittingNoClass}
            onClick={handleConfirmNoClass}
            className="w-full text-xs font-semibold"
          >
            Confirm Cancellation
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
