'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Calendar,
  HelpCircle,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  Search,
  Users,
  MapPin,
  Clock,
  Video,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DisputeSheet } from '@/components/classmate/dispute-sheet'
import {
  type PublicSessionPageData,
} from '@/lib/data/public-views'
import { formatTimeRange12 } from '@/lib/format-time'

export interface PublicSessionDetailViewProps {
  data: PublicSessionPageData
}

export function PublicSessionDetailView({ data }: PublicSessionDetailViewProps) {
  const { subject, session, roster, stats } = data

  const [disputeOpen, setDisputeOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterType, setFilterType] = React.useState<
    'all' | 'present' | 'absent' | 'excused' | 'conflict' | 'recited'
  >('all')

  const isNoClass = session.kind === 'noClass'

  // Filter student entries
  const filteredEntries = React.useMemo(() => {
    return session.entries.filter((entry) => {
      // 1. Attendance filter
      if (filterType === 'present' && entry.attendance !== 'P') return false
      if (filterType === 'absent' && entry.attendance !== 'A') return false
      if (filterType === 'excused' && entry.attendance !== 'E') return false
      if (filterType === 'conflict' && entry.attendance !== 'C') return false
      if (filterType === 'recited' && (!entry.recitations || entry.recitations <= 0)) return false

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        if (!entry.student.name.toLowerCase().includes(q)) {
          return false
        }
      }

      return true
    })
  }, [session.entries, filterType, searchQuery])

  const recitedCount = React.useMemo(() => {
    return session.entries.filter((e) => (e.recitations || 0) > 0).length
  }, [session.entries])

  return (
    <div className="flex flex-col gap-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/s/${subject.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors min-h-[44px] px-2 -ml-2 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{subject.code} Hub</span>
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDisputeOpen(true)}
          className="text-xs text-text-secondary hover:text-text-primary h-9 min-h-[44px] px-3 gap-1.5 rounded-lg border-border bg-surface-1 shadow-sm"
        >
          <HelpCircle className="h-3.5 w-3.5 text-brand" />
          <span>Something wrong?</span>
        </Button>
      </div>

      {/* Session Title Header Card */}
      <header className="flex flex-col gap-3 p-5 rounded-2xl border border-border bg-surface-1 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-brand-tint text-brand-text">
              {subject.code}
            </span>
            {subject.sectionMark && (
              <Badge variant="neutral">
                Sec {subject.sectionMark}
              </Badge>
            )}
          </div>
          <span className="text-xs text-text-tertiary">Official Class Attendance</span>
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Session {session.date}
            </h1>
            {isNoClass && (
              <Badge variant="neutral" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-semibold">
                No Class
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {subject.name} {subject.professor ? `· Prof. ${subject.professor}` : ''}
          </p>
        </div>

        {/* Schedule & Location Details */}
        {(subject.room || subject.zoomUrl || (subject.schedule && subject.schedule.length > 0)) && (
          <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-border/60 text-xs text-text-secondary">
            {subject.schedule && subject.schedule.length > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-text-quaternary" />
                <span>
                  {subject.schedule
                    .map(
                      (s: any) =>
                        `${(s.weekday || s.day || '').charAt(0).toUpperCase() + (s.weekday || s.day || '').slice(1)} ${formatTimeRange12(s.start || s.startTime, s.end || s.endTime)}`,
                    )
                    .join(', ')}
                </span>
              </div>
            )}
            {subject.room && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-text-quaternary" />
                <span>{subject.room}</span>
              </div>
            )}
            {subject.zoomUrl && (
              <a
                href={subject.zoomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand hover:underline"
              >
                <Video className="h-3.5 w-3.5" />
                <span>Zoom Link</span>
              </a>
            )}
          </div>
        )}
      </header>

      {/* No Class Cancellation Banner */}
      {isNoClass && (
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-text-primary shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
            <Calendar className="h-4 w-4" />
            <span>Class Suspended / No Meeting</span>
          </div>
          <p className="text-xs text-text-secondary">
            {session.noClassReason || 'There was no held class session on this calendar date.'}
          </p>
        </div>
      )}

      {/* Regular Session Attendance Stats Grid */}
      {!isNoClass && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-0.5">
              <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Rate</span>
              <span className="text-xl font-bold font-mono text-brand">
                {stats.attendanceRate}%
              </span>
              <span className="text-[10px] text-text-tertiary">attendance</span>
            </div>

            <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-0.5">
              <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Present</span>
              <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {stats.presentCount}
              </span>
              <span className="text-[10px] text-text-tertiary">students</span>
            </div>

            <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-0.5">
              <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Absent</span>
              <span className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400">
                {stats.absentCount}
              </span>
              <span className="text-[10px] text-text-tertiary">students</span>
            </div>

            <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-0.5">
              <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Excused</span>
              <span className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
                {stats.excusedCount}
              </span>
              <span className="text-[10px] text-text-tertiary">approved</span>
            </div>

            <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-0.5">
              <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Conflict</span>
              <span className="text-xl font-bold font-mono text-purple-700 dark:text-purple-400">
                {stats.conflictCount}
              </span>
              <span className="text-[10px] text-text-tertiary">co-curricular</span>
            </div>

            <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-0.5">
              <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Recited</span>
              <span className="text-xl font-bold font-mono text-purple-700 dark:text-purple-400">
                {stats.totalRecitations}
              </span>
              <span className="text-[10px] text-text-tertiary">total points</span>
            </div>
          </section>

          {/* Student Roll Call Search and Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
                {(
                  [
                    { id: 'all', label: 'All', count: stats.totalStudents },
                    { id: 'present', label: 'Present', count: stats.presentCount },
                    { id: 'absent', label: 'Absent', count: stats.absentCount },
                    { id: 'excused', label: 'Excused', count: stats.excusedCount },
                    { id: 'conflict', label: 'Conflict', count: stats.conflictCount },
                    { id: 'recited', label: 'Recited', count: recitedCount },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[38px] ${
                      filterType === tab.id
                        ? 'bg-brand text-on-brand'
                        : 'bg-surface-2 text-text-secondary hover:text-text-primary border border-border'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        filterType === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-3 text-text-tertiary'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative shrink-0 sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student name..."
                  className="w-full h-10 min-h-[40px] rounded-lg border border-border bg-surface-1 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {/* Students Table / Grid */}
            {filteredEntries.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface-1 p-8 text-center text-xs text-text-secondary">
                <Users className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-text-primary">No students match this filter</p>
                <p className="mt-1">Try resetting the search or selecting &quot;All&quot; above.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface-1 divide-y divide-border overflow-hidden shadow-sm">
                {filteredEntries.map((entry, idx) => {
                  const att = entry.attendance
                  const isPresent = att === 'P'
                  const isAbsent = att === 'A'
                  const isExcused = att === 'E'
                  const isConflict = att === 'C'
                  const isUnset = !att

                  return (
                    <div
                      key={entry.student.id}
                      className="flex items-center justify-between p-3.5 hover:bg-surface-2/40 transition-colors gap-3"
                    >
                      {/* Left: Index & Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-text-quaternary w-6 shrink-0 text-right">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-text-primary truncate">
                            {entry.student.name}
                          </span>
                          {entry.recitations > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                              <Sparkles className="h-3 w-3" />
                              {entry.recitations} {entry.recitations === 1 ? 'pt' : 'pts'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Attendance Status Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPresent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-success/15 text-success border border-success/30">
                            <Check className="h-3.5 w-3.5" /> Present
                          </span>
                        )}
                        {isAbsent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-danger/15 text-danger border border-danger/30">
                            <X className="h-3.5 w-3.5" /> Absent
                          </span>
                        )}
                        {isExcused && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-warning/15 text-warning border border-warning/30">
                            <AlertTriangle className="h-3.5 w-3.5" /> Excused
                          </span>
                        )}
                        {isConflict && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-brand-tint text-brand-text border border-brand/30">
                            Conflict
                          </span>
                        )}
                        {isUnset && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-2 text-text-tertiary border border-border">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Slide-up Dispute Drawer */}
      <DisputeSheet
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        subjectId={subject.id}
        sessionId={session.id}
        sessionDate={session.date}
        roster={roster}
      />
    </div>
  )
}
