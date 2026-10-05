'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Clock,
  ExternalLink,
  Play,
  CalendarOff,
  Copy,
  Check,
  Calendar,
  Users,
  Inbox,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  Flame,
  ChevronRight,
  BookOpen,
  Pin,
  HelpCircle,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import type {
  SubjectHomeHeaderData,
  SubjectSessionSummaryItem,
  SubjectRosterItem,
  SubjectRequestItem,
} from '@/lib/subjects/subject-home'
import type {
  SubjectMonitoringSummary,
  StudentMonitoringResult,
} from '@/lib/stats/absentee-monitoring'

export type SubjectHomeTab = 'sessions' | 'roster' | 'posts' | 'requests' | 'monitoring' | 'reports'

export interface SubjectPostItem {
  id: string
  type: 'announcement' | 'resource' | 'question'
  title: string
  body?: string
  status: 'published' | 'draft' | 'archived'
  publishedAt?: string
  priority?: boolean
  pinnedUntil?: string
  category?: string
  url?: string
  tags?: string[]
  official?: boolean
}

interface SubjectHomeViewProps {
  header: SubjectHomeHeaderData
  todayDate: string
  sessions?: SubjectSessionSummaryItem[]
  roster?: SubjectRosterItem[]
  posts?: SubjectPostItem[]
  requests?: SubjectRequestItem[]
  monitoring?: SubjectMonitoringSummary
  reportToken?: string
  counts?: {
    sessions?: number
    students?: number
    posts?: number
    pendingRequests?: number
    flaggedStudents?: number
  }
}

export function SubjectHomeView({
  header,
  todayDate,
  sessions = [],
  roster = [],
  posts = [],
  requests = [],
  monitoring,
  reportToken = '',
  counts,
}: SubjectHomeViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SubjectHomeTab>('sessions')
  const [startingSession, setStartingSession] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [rosterSearch, setRosterSearch] = useState('')

  // Posts & Knowledge State
  const [postTypeFilter, setPostTypeFilter] = useState<'all' | 'announcement' | 'resource' | 'question'>('all')
  const [postSearch, setPostSearch] = useState('')

  const filteredPosts = (posts || []).filter((post) => {
    if (postTypeFilter !== 'all' && post.type !== postTypeFilter) return false
    if (postSearch.trim()) {
      const q = postSearch.toLowerCase()
      return post.title.toLowerCase().includes(q) || (post.body && post.body.toLowerCase().includes(q))
    }
    return true
  })

  // Professor Report Token State
  const [currentReportToken, setCurrentReportToken] = useState(reportToken)
  const [resettingToken, setResettingToken] = useState(false)
  const [copiedReportLink, setCopiedReportLink] = useState(false)
  const [resetReportConfirmOpen, setResetReportConfirmOpen] = useState(false)

  // Absentee Monitoring State
  const [monitoringFilter, setMonitoringFilter] = useState<
    'all_flagged' | 'no_attendance' | 'below_50' | 'exceeded' | 'watch_risk' | 'all'
  >('all_flagged')
  const [monitoringSearch, setMonitoringSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<StudentMonitoringResult | null>(null)

  // Requests Review State
  const [requestFilter, setRequestFilter] = useState<'pending' | 'approved' | 'declined' | 'all'>('pending')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [selectedProof, setSelectedProof] = useState<{ url: string; studentName: string } | null>(null)

  const handleCopyReportLink = async () => {
    if (!currentReportToken) return
    const url = `${window.location.origin}/prof/${currentReportToken}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedReportLink(true)
      setTimeout(() => setCopiedReportLink(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleResetToken = async () => {
    try {
      setResettingToken(true)
      const res = await fetch('/api/reports/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: header.subjectId }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        setCurrentReportToken(data.token)
        setResetReportConfirmOpen(false)
      }
    } catch (err) {
      console.error('Failed to reset report token', err)
    } finally {
      setResettingToken(false)
    }
  }

  // No Class modal state
  const [noClassModalOpen, setNoClassModalOpen] = useState(false)
  const [noClassReason, setNoClassReason] = useState('')
  const [submittingNoClass, setSubmittingNoClass] = useState(false)

  const handleStartSession = async () => {
    try {
      setStartingSession(true)
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: header.subjectId,
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
      setStartingSession(false)
    }
  }

  const handleCopyPublicLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${header.publicUrl}`
      await navigator.clipboard.writeText(fullUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy public URL', err)
    }
  }

  const handleConfirmNoClass = async () => {
    try {
      setSubmittingNoClass(true)
      const res = await fetch('/api/sessions/no-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: header.subjectId,
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

  const handleReviewRequest = async (requestId: string, decision: 'approved' | 'declined') => {
    try {
      setReviewingId(requestId)
      const res = await fetch('/api/requests/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, decision }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to ${decision} request`)
      }

      router.refresh()
    } catch (err: any) {
      alert(err?.message || `Error reviewing request`)
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-16">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/console/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors py-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Subject Header Card */}
      <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-text-primary tracking-wide">
                {header.code}
              </span>
              {header.sectionMark && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-surface-2 text-text-secondary border border-border">
                  {header.sectionMark}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-text-primary mt-1">
              {header.name}
            </h1>

            {header.professor && (
              <p className="text-xs text-text-tertiary mt-0.5">
                Instructor: Prof. {header.professor}
              </p>
            )}

            <div className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium px-2.5 py-1 rounded-md bg-surface-2 border border-border text-text-secondary">
              <Clock className="h-3.5 w-3.5 text-brand" />
              <span>Next Class:</span>
              <span className="text-text-primary font-semibold">{header.nextMeetingBadge}</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <Button
              type="button"
              variant="primary"
              onClick={handleStartSession}
              loading={startingSession}
              className="text-xs min-h-[44px] px-4 font-semibold shadow-sm"
            >
              <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
              Start Class Session
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setNoClassReason('')
                setNoClassModalOpen(true)
              }}
              className="text-xs min-h-[44px] px-3 font-medium text-text-secondary hover:text-text-primary"
            >
              <CalendarOff className="h-3.5 w-3.5 mr-1.5" />
              Mark No Class
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleCopyPublicLink}
              className="text-xs min-h-[44px] px-3 font-medium text-text-secondary hover:text-text-primary"
              title="Copy unlisted public link for Messenger"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Public Link
                </>
              )}
            </Button>

            <Link
              href={header.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg border border-border bg-surface-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors shrink-0"
              title="Open public classmate view"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
            activeTab === 'sessions'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Sessions
          {typeof counts?.sessions === 'number' && (
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-2 border border-border">
              {counts.sessions}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
            activeTab === 'roster'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Users className="h-4 w-4" />
          Roster
          {typeof counts?.students === 'number' && (
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-2 border border-border">
              {counts.students}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
            activeTab === 'posts'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Posts
          {typeof counts?.posts === 'number' && counts.posts > 0 && (
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-2 border border-border">
              {counts.posts}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
            activeTab === 'requests'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Inbox className="h-4 w-4" />
          Requests
          {typeof counts?.pendingRequests === 'number' && counts.pendingRequests > 0 && (
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
              {counts.pendingRequests}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monitoring')}
          className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
            activeTab === 'monitoring'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Monitoring
          {typeof monitoring?.totalFlaggedCount === 'number' && monitoring.totalFlaggedCount > 0 && (
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30">
              {monitoring.totalFlaggedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
            activeTab === 'reports'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText className="h-4 w-4" />
          Reports
        </button>
      </div>

      {/* Tab Panels */}
      <div className="min-h-[300px]">
        {activeTab === 'sessions' && (
          <div className="flex flex-col gap-3">
            {sessions.length > 0 ? (
              sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-surface-1 shadow-sm hover:border-border-hover transition-colors"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-text-primary">
                        {sess.date}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                          sess.kind === 'noClass'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-brand/10 text-brand-text border-brand/20'
                        }`}
                      >
                        {sess.kind === 'noClass' ? 'No Class' : 'Class Session'}
                      </span>
                      <span className="text-[11px] text-text-tertiary">
                        v{sess.version}
                      </span>
                    </div>

                    {sess.kind === 'noClass' ? (
                      <p className="text-xs text-text-secondary italic mt-0.5">
                        {sess.noClassReason || 'Class suspended / No meeting'}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2.5 text-xs text-text-secondary mt-1 flex-wrap">
                        <span className="text-text-primary font-medium">
                          {sess.presentCount} / {sess.totalEntries} present
                        </span>
                        <span>·</span>
                        <span className="text-brand font-semibold">
                          {sess.attendanceRate}% attendance
                        </span>
                        {sess.absentCount > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-red-400">
                              {sess.absentCount} absent
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                    <Link
                      href={`/console/session/${sess.id}`}
                      className="inline-flex items-center justify-center min-h-[44px] px-3.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-xs font-semibold text-text-primary transition-colors flex-1 sm:flex-initial"
                    >
                      Open Session
                    </Link>
                    <Link
                      href={`/s/${header.slug}/sessions/${sess.date}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors shrink-0"
                      title="View public classmate attendance sheet"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-surface-1 p-8 text-center text-xs text-text-secondary">
                <Calendar className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-text-primary">No sessions held yet</p>
                <p className="mt-1">Tap &quot;Start Class Session&quot; above to begin your first roll call.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="flex flex-col gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search enrolled students by name or student number..."
                className="w-full h-11 min-h-[44px] rounded-lg border border-border bg-surface-1 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="text-xs text-text-tertiary px-1">
              Showing{' '}
              {
                roster.filter((s) => {
                  if (!rosterSearch.trim()) return true
                  const q = rosterSearch.toLowerCase()
                  return (
                    s.name.toLowerCase().includes(q) ||
                    (s.studentNumber && s.studentNumber.toLowerCase().includes(q))
                  )
                }).length
              }{' '}
              of {roster.length} active students
            </div>

            {roster.filter((s) => {
              if (!rosterSearch.trim()) return true
              const q = rosterSearch.toLowerCase()
              return (
                s.name.toLowerCase().includes(q) ||
                (s.studentNumber && s.studentNumber.toLowerCase().includes(q))
              )
            }).length > 0 ? (
              <div className="rounded-xl border border-border bg-surface-1 divide-y divide-border overflow-hidden shadow-sm">
                {roster
                  .filter((s) => {
                    if (!rosterSearch.trim()) return true
                    const q = rosterSearch.toLowerCase()
                    return (
                      s.name.toLowerCase().includes(q) ||
                      (s.studentNumber && s.studentNumber.toLowerCase().includes(q))
                    )
                  })
                  .map((student, idx) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3.5 hover:bg-surface-2/40 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-text-quaternary w-6 shrink-0 text-right">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-text-primary truncate">
                              {student.name}
                            </span>
                            {student.hasScheduleConflict && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                Conflict
                              </span>
                            )}
                          </div>
                          {student.studentNumber && (
                            <span className="font-mono text-[11px] text-text-tertiary">
                              {student.studentNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-2 text-text-secondary border border-border">
                          {header.sectionMark || 'Enrolled'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface-1 p-8 text-center text-xs text-text-secondary">
                <Users className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-text-primary">No students found</p>
                <p className="mt-1">
                  {rosterSearch
                    ? `No enrolled students match "${rosterSearch}"`
                    : 'No active students enrolled in this subject.'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="flex flex-col gap-4">
            {/* Filter buttons & Action Shortcuts */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {(
                  [
                    { id: 'all', label: 'All Posts' },
                    { id: 'announcement', label: 'Announcements' },
                    { id: 'resource', label: 'Resources' },
                    { id: 'question', label: 'Q&A' },
                  ] as const
                ).map((tab) => {
                  const count = (posts || []).filter((p) =>
                    tab.id === 'all' ? true : p.type === tab.id,
                  ).length
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPostTypeFilter(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[38px] ${
                        postTypeFilter === tab.id
                          ? 'bg-brand/10 border-brand/30 text-brand font-semibold'
                          : 'bg-surface-1 border-border text-text-secondary hover:text-text-primary hover:bg-surface-2'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-2 border border-border">
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/console/posts/new?type=announcement&subject=${header.subjectId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-medium text-text-primary transition-colors min-h-[38px]"
                >
                  <Plus className="h-3.5 w-3.5 text-brand" />
                  <span>Announcement</span>
                </Link>
                <Link
                  href={`/console/posts/new?type=resource&subject=${header.subjectId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-medium text-text-primary transition-colors min-h-[38px]"
                >
                  <Plus className="h-3.5 w-3.5 text-brand" />
                  <span>Resource</span>
                </Link>
                <Link
                  href={`/console/posts/new?type=question&subject=${header.subjectId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-medium text-text-primary transition-colors min-h-[38px]"
                >
                  <Plus className="h-3.5 w-3.5 text-brand" />
                  <span>Q&A</span>
                </Link>
              </div>
            </div>

            {/* Posts Content */}
            {filteredPosts.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-surface-1 shadow-sm hover:border-border-hover transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              post.type === 'announcement'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : post.type === 'resource'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {post.type === 'question' ? 'Q&A' : post.type}
                          </span>
                          {post.priority && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand-text border border-brand/20">
                              <Pin className="h-3 w-3" />
                              Pinned
                              {post.pinnedUntil && (
                                <span className="font-normal opacity-80 text-[10px]">
                                  ({post.pinnedUntil})
                                </span>
                              )}
                            </span>
                          )}
                          {post.official && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Official
                            </span>
                          )}
                          {post.type === 'resource' && post.category && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-2 text-text-secondary border border-border">
                              {post.category}
                            </span>
                          )}
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded border capitalize ${
                              post.status === 'published'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : post.status === 'draft'
                                  ? 'bg-surface-2 text-text-tertiary border-border'
                                  : 'bg-surface-2 text-text-quaternary border-border'
                            }`}
                          >
                            {post.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-text-primary mt-1">
                          {post.title}
                        </h3>
                        {post.body && (
                          <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
                            {post.body}
                          </p>
                        )}
                        {post.type === 'question' && post.tags && post.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {post.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-2 text-text-tertiary border border-border"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {post.type === 'resource' && post.url && (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-medium text-text-primary transition-colors min-h-[36px] shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-brand" />
                          <span>Open Resource</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface-1 p-8 text-center text-xs text-text-secondary flex flex-col items-center">
                <BookOpen className="h-8 w-8 text-text-tertiary mb-3 opacity-60" />
                <p className="font-semibold text-text-primary text-sm">Knowledge Hub & Posts</p>
                <p className="mt-1 max-w-md text-text-secondary">
                  Publish class announcements, lecture resources & attachments, or answer frequent student questions with an Official Secretary badge.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    href={`/console/posts/new?type=announcement&subject=${header.subjectId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-medium text-text-primary transition-colors min-h-[38px]"
                  >
                    <Plus className="h-3.5 w-3.5 text-brand" />
                    <span>Create Announcement</span>
                  </Link>
                  <Link
                    href={`/console/posts/new?type=resource&subject=${header.subjectId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-medium text-text-primary transition-colors min-h-[38px]"
                  >
                    <Plus className="h-3.5 w-3.5 text-brand" />
                    <span>Share Resource</span>
                  </Link>
                  <Link
                    href={`/console/posts/new?type=question&subject=${header.subjectId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-medium text-text-primary transition-colors min-h-[38px]"
                  >
                    <Plus className="h-3.5 w-3.5 text-brand" />
                    <span>Answer Q&A</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="flex flex-col gap-4">
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {(
                [
                  { id: 'pending', label: 'Pending' },
                  { id: 'approved', label: 'Approved' },
                  { id: 'declined', label: 'Declined' },
                  { id: 'all', label: 'All Requests' },
                ] as const
              ).map((tab) => {
                const count = requests.filter((r) =>
                  tab.id === 'all' ? true : r.status === tab.id,
                ).length
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRequestFilter(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[38px] ${
                      requestFilter === tab.id
                        ? 'bg-brand text-on-brand'
                        : 'bg-surface-2 text-text-secondary hover:text-text-primary border border-border'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        requestFilter === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-3 text-text-tertiary'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Requests List */}
            {requests.filter((r) => (requestFilter === 'all' ? true : r.status === requestFilter)).length > 0 ? (
              <div className="flex flex-col gap-3">
                {requests
                  .filter((r) => (requestFilter === 'all' ? true : r.status === requestFilter))
                  .map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-3 hover:border-border-hover transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-text-primary">
                            {req.studentName}
                          </span>
                          {req.studentNumber && (
                            <span className="font-mono text-[11px] text-text-tertiary">
                              {req.studentNumber}
                            </span>
                          )}
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                              req.type === 'present'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : req.type === 'excuse'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}
                          >
                            {req.type === 'present'
                              ? 'I was present'
                              : req.type === 'excuse'
                              ? 'Excuse'
                              : `Recitation (+${req.count || 1})`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-text-tertiary">
                          {req.sessionDate && (
                            <Link
                              href={`/console/session/${req.sessionId}`}
                              className="hover:text-text-primary underline flex items-center gap-1"
                            >
                              <span>Class: {req.sessionDate}</span>
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Request Content / Reason */}
                      <div className="text-xs text-text-secondary">
                        {req.reason && (
                          <div className="flex items-start gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-text-tertiary shrink-0 mt-0.5" />
                            <p className="text-text-primary italic">&quot;{req.reason}&quot;</p>
                          </div>
                        )}
                        {req.topic && (
                          <p className="text-text-tertiary mt-1">
                            Topic: <span className="text-text-primary">{req.topic}</span>
                          </p>
                        )}
                      </div>

                      {/* Proof and Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        {req.proofUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedProof({ url: req.proofUrl!, studentName: req.studentName })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-medium text-text-primary transition-colors min-h-[38px]"
                          >
                            <Eye className="h-3.5 w-3.5 text-brand" />
                            <span>View Proof Image</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-text-quaternary">No proof attached</span>
                        )}

                        {req.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              loading={reviewingId === req.id}
                              onClick={() => handleReviewRequest(req.id, 'approved')}
                              className="text-xs min-h-[38px] px-3 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              loading={reviewingId === req.id}
                              onClick={() => handleReviewRequest(req.id, 'declined')}
                              className="text-xs min-h-[38px] px-3 font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Decline
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-md capitalize ${
                                req.status === 'approved'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface-1 p-8 text-center text-xs text-text-secondary">
                <Inbox className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-text-primary">No {requestFilter} requests</p>
                <p className="mt-1">
                  {requestFilter === 'pending'
                    ? 'All classmate correction requests have been addressed.'
                    : `No requests with status "${requestFilter}".`}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="flex flex-col gap-5">
            {/* 1. 5 Summary Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3.5 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-1">
                <span className="text-[11px] text-text-secondary font-medium">Class Sessions</span>
                <span className="text-xl font-bold font-mono text-text-primary">
                  {monitoring?.totalHeldClassSessions ?? 0}
                </span>
                <span className="text-[10px] text-text-tertiary">held this term</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-1">
                <span className="text-[11px] text-text-secondary font-medium">Active Roster</span>
                <span className="text-xl font-bold font-mono text-text-primary">
                  {monitoring?.activeStudents ?? 0}
                </span>
                <span className="text-[10px] text-text-tertiary">enrolled students</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-1">
                <span className="text-[11px] text-text-secondary font-medium">No Attendance</span>
                <span
                  className={`text-xl font-bold font-mono ${
                    (monitoring?.noAttendanceCount ?? 0) > 0 ? 'text-red-400' : 'text-text-primary'
                  }`}
                >
                  {monitoring?.noAttendanceCount ?? 0}
                </span>
                <span className="text-[10px] text-text-tertiary">0 sessions attended</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-1">
                <span className="text-[11px] text-text-secondary font-medium">Below 50%</span>
                <span
                  className={`text-xl font-bold font-mono ${
                    (monitoring?.below50Count ?? 0) > 0 ? 'text-amber-400' : 'text-text-primary'
                  }`}
                >
                  {monitoring?.below50Count ?? 0}
                </span>
                <span className="text-[10px] text-text-tertiary">&lt; 50% attendance rate</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-1 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-text-secondary font-medium">Total Flagged</span>
                <span
                  className={`text-xl font-bold font-mono ${
                    (monitoring?.totalFlaggedCount ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {monitoring?.totalFlaggedCount ?? 0}
                </span>
                <span className="text-[10px] text-text-tertiary">needs attention</span>
              </div>
            </div>

            {/* 2. Filter Buttons & Search */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {(
                  [
                    { id: 'all_flagged', label: 'Flagged', count: monitoring?.totalFlaggedCount ?? 0 },
                    { id: 'no_attendance', label: 'No Attendance', count: monitoring?.noAttendanceCount ?? 0 },
                    { id: 'below_50', label: 'Below 50%', count: monitoring?.below50Count ?? 0 },
                    { id: 'exceeded', label: 'Exceeded', count: monitoring?.exceededCount ?? 0 },
                    {
                      id: 'watch_risk',
                      label: 'Watch / Risk',
                      count: (monitoring?.atRiskCount ?? 0) + (monitoring?.watchCount ?? 0),
                    },
                    { id: 'all', label: 'All Roster', count: monitoring?.totalStudents ?? 0 },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMonitoringFilter(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[38px] ${
                      monitoringFilter === tab.id
                        ? 'bg-brand text-on-brand'
                        : 'bg-surface-2 text-text-secondary hover:text-text-primary border border-border'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        monitoringFilter === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-3 text-text-tertiary'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative shrink-0 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <input
                  type="text"
                  value={monitoringSearch}
                  onChange={(e) => setMonitoringSearch(e.target.value)}
                  placeholder="Filter student..."
                  className="w-full h-10 min-h-[40px] rounded-lg border border-border bg-surface-1 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Flagged Students Table / Cards (Ranked lowest attendance first) */}
            {(() => {
              const studentsSource = monitoring
                ? monitoringFilter === 'all'
                  ? monitoring.students
                  : monitoring.flaggedStudents
                : []

              const filtered = studentsSource
                .filter((s) => {
                  if (monitoringFilter === 'no_attendance' && !s.isNoAttendance) return false
                  if (monitoringFilter === 'below_50' && !s.isBelow50) return false
                  if (monitoringFilter === 'exceeded' && !s.isExceeded) return false
                  if (monitoringFilter === 'watch_risk' && !s.isWatch && !s.isAtRisk) return false

                  if (monitoringSearch.trim()) {
                    const q = monitoringSearch.toLowerCase()
                    const matchName = s.name.toLowerCase().includes(q)
                    const matchNum = s.studentNumber?.toLowerCase().includes(q)
                    if (!matchName && !matchNum) return false
                  }
                  return true
                })
                .sort((a, b) => a.attendanceRate - b.attendanceRate || b.absentCount - a.absentCount)

              if (filtered.length === 0) {
                return (
                  <div className="rounded-xl border border-border bg-surface-1 p-8 text-center text-xs text-text-secondary">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-text-primary">
                      {monitoringFilter === 'all_flagged'
                        ? 'No students are currently flagged!'
                        : `No students found matching this filter.`}
                    </p>
                    <p className="mt-1">
                      {monitoringFilter === 'all_flagged'
                        ? 'All enrolled students maintain satisfactory attendance above syllabus thresholds.'
                        : 'Try selecting a different filter above.'}
                    </p>
                  </div>
                )
              }

              return (
                <div className="rounded-xl border border-border bg-surface-1 divide-y divide-border overflow-hidden shadow-sm">
                  {filtered.map((s, idx) => (
                    <div
                      key={s.studentId}
                      onClick={() => setSelectedStudent(s)}
                      className="p-3.5 hover:bg-surface-2/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Name and student info */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-text-quaternary w-6 shrink-0 text-right pt-0.5 sm:pt-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-text-primary truncate">
                              {s.name}
                            </span>
                            {s.hasScheduleConflict && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                Conflict
                              </span>
                            )}
                            {s.dropped && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-3 text-text-tertiary border border-border">
                                Dropped
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap">
                            {s.studentNumber && (
                              <span className="font-mono text-[11px]">{s.studentNumber}</span>
                            )}
                            <span>·</span>
                            <span className="text-text-secondary font-medium">
                              {s.presentStarCount} / {s.eligibleSessionsCount} attended
                            </span>
                            <span>·</span>
                            <span
                              className={
                                s.absentCount >= (monitoring?.absenceLimit ?? 4)
                                  ? 'text-rose-400 font-semibold'
                                  : 'text-text-secondary'
                              }
                            >
                              {s.absentCount} absences
                            </span>
                            {s.recitationsCount > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-purple-400 font-medium">
                                  {s.recitationsCount} recitations
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Badges, Rate %, and Inspect Arrow */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto flex-wrap">
                        {/* Threshold Category Badges */}
                        {s.isNoAttendance && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                            No Attendance
                          </span>
                        )}
                        {s.isBelow50 && !s.isNoAttendance && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Below 50%
                          </span>
                        )}
                        {s.isExceeded && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Exceeded Limit
                          </span>
                        )}
                        {s.isAtRisk && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                            At Risk
                          </span>
                        )}
                        {s.isWatch && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            Watch
                          </span>
                        )}

                        {/* Streak Badge */}
                        {s.hasStreak && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
                            <Flame className="h-3 w-3" />
                            {s.consecutiveAbsences} Streak
                          </span>
                        )}

                        {/* Attendance Rate Badge */}
                        <div
                          className={`min-w-[48px] text-right font-mono text-xs font-bold px-2 py-1 rounded-lg border ${
                            s.attendanceRate < 50
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : s.attendanceRate < 75
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {s.attendanceRate}%
                        </div>

                        <ChevronRight className="h-4 w-4 text-text-quaternary" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="flex flex-col gap-6">
            {/* Header info */}
            <div>
              <h2 className="text-sm font-bold text-text-primary tracking-tight">
                Professor Live Report Access
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Provide your professor with an unlisted, read-only attendance report matching the official syllabus matrix. No login or password required.
              </p>
            </div>

            {/* Active Link Box */}
            <div className="p-4 sm:p-5 rounded-xl border border-brand/30 bg-surface-1 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-text-primary">
                    Active Professor Link
                  </span>
                </div>
                <span className="text-[11px] text-text-tertiary font-mono">
                  Token: {currentReportToken ? `${currentReportToken.slice(0, 10)}...` : 'Generating...'}
                </span>
              </div>

              {/* URL Display and Copy */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-xs font-mono text-text-secondary overflow-x-auto select-all">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/prof/${currentReportToken}`
                    : `/prof/${currentReportToken}`}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleCopyReportLink}
                    disabled={!currentReportToken}
                    className="text-xs min-h-[42px] px-3.5 flex-1 sm:flex-initial"
                  >
                    {copiedReportLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy Link
                      </>
                    )}
                  </Button>

                  <a
                    href={`/prof/${currentReportToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center min-h-[42px] px-3.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-text-primary transition-colors flex-1 sm:flex-initial"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Preview
                  </a>
                </div>
              </div>

              <p className="text-[11px] text-text-tertiary">
                Anyone with this unlisted link can inspect current attendance summaries, held session dates, and student attendance rates.
              </p>
            </div>

            {/* Token Reset / Revoke Section */}
            <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1 max-w-xl">
                <span className="text-xs font-bold text-text-primary">
                  Revoke & Reset Access Token
                </span>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Resetting the token immediately revokes the current URL. Any professor or recipient opening the old link will see an explanatory &quot;Link expired&quot; page.
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setResetReportConfirmOpen(true)}
                className="text-xs min-h-[42px] px-4 font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 shrink-0 self-start sm:self-auto"
              >
                Reset Token
              </Button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-surface-1/60 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-text-primary">
                  Official Prelims Format
                </span>
                <p className="text-[11px] text-text-tertiary leading-relaxed">
                  Generates the 3-page attendance matrix with Present*, Excused, and Schedule Conflict columns ready for print and CSV download.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-1/60 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-text-primary">
                  Real-Time Updates
                </span>
                <p className="text-[11px] text-text-tertiary leading-relaxed">
                  Live reports update automatically whenever sessions are published or classmate excuse disputes are resolved.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-1/60 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-text-primary">
                  Zero Leak Guarantee
                </span>
                <p className="text-[11px] text-text-tertiary leading-relaxed">
                  Private student excuse medical proofs, notes, and internal remarks are permanently stripped from the professor report view.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset Report Token Confirmation Modal */}
      <BottomSheet
        open={resetReportConfirmOpen}
        onClose={() => setResetReportConfirmOpen(false)}
        title="Reset Professor Access Token?"
        description="This will immediately revoke the current link."
      >
        <div className="flex flex-col gap-4 py-2">
          <p className="text-xs text-text-secondary leading-relaxed">
            Are you sure you want to reset the professor report link for <strong className="text-text-primary">{header.code}</strong>? Any previously shared link will immediately stop working and show &quot;Link expired&quot;.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setResetReportConfirmOpen(false)}
              className="flex-1 text-xs min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={resettingToken}
              onClick={handleResetToken}
              className="flex-1 text-xs min-h-[44px] bg-red-600 hover:bg-red-500 font-semibold text-white"
            >
              Confirm Reset
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* No Class Modal */}
      <BottomSheet
        open={noClassModalOpen}
        onClose={() => setNoClassModalOpen(false)}
        title="Mark No Class"
        description={`Cancel class for ${header.code} on ${todayDate}.`}
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="subjectNoClassReason" className="text-xs font-medium text-text-secondary">
              Reason (Optional)
            </label>
            <input
              id="subjectNoClassReason"
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
            className="w-full text-xs font-semibold min-h-[44px]"
          >
            Confirm Cancellation
          </Button>
        </div>
      </BottomSheet>

      {/* Proof Preview Modal */}
      <BottomSheet
        open={Boolean(selectedProof)}
        onClose={() => setSelectedProof(null)}
        title={selectedProof ? `Excuse Proof · ${selectedProof.studentName}` : 'Excuse Proof'}
      >
        <div className="flex flex-col gap-3 py-2">
          {selectedProof?.url && (
            <div className="rounded-lg overflow-hidden border border-border bg-surface-2 max-h-[60vh] flex items-center justify-center p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedProof.url}
                alt="Excuse proof"
                className="max-h-[58vh] w-auto object-contain rounded"
              />
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedProof(null)}
            className="w-full text-xs font-semibold min-h-[44px]"
          >
            Close
          </Button>
        </div>
      </BottomSheet>

      {/* Student Attendance Inspection Drawer */}
      <BottomSheet
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        title={selectedStudent ? selectedStudent.name : 'Student Attendance'}
        description={
          selectedStudent
            ? `${selectedStudent.studentNumber || 'No student #'} · ${
                selectedStudent.sectionMark || 'Enrolled'
              }`
            : undefined
        }
      >
        {selectedStudent && (
          <div className="flex flex-col gap-4 py-2">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-lg border border-border bg-surface-2">
                <span className="text-[10px] text-text-tertiary block">Attendance</span>
                <span className="text-base font-bold font-mono text-text-primary">
                  {selectedStudent.attendanceRate}%
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-surface-2">
                <span className="text-[10px] text-text-tertiary block">Attended*</span>
                <span className="text-base font-bold font-mono text-brand">
                  {selectedStudent.presentStarCount}/{selectedStudent.eligibleSessionsCount}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-surface-2">
                <span className="text-[10px] text-text-tertiary block">Absences</span>
                <span
                  className={`text-base font-bold font-mono ${
                    selectedStudent.absentCount >= (monitoring?.absenceLimit ?? 4)
                      ? 'text-rose-400'
                      : 'text-text-primary'
                  }`}
                >
                  {selectedStudent.absentCount}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-surface-2">
                <span className="text-[10px] text-text-tertiary block">Streak</span>
                <span
                  className={`text-base font-bold font-mono ${
                    selectedStudent.hasStreak ? 'text-orange-400' : 'text-text-secondary'
                  }`}
                >
                  {selectedStudent.consecutiveAbsences}
                </span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedStudent.isNoAttendance && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                  No Attendance
                </span>
              )}
              {selectedStudent.isBelow50 && !selectedStudent.isNoAttendance && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Below 50%
                </span>
              )}
              {selectedStudent.isExceeded && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Exceeded Absence Limit
                </span>
              )}
              {selectedStudent.isAtRisk && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                  At Risk of Dropping
                </span>
              )}
              {selectedStudent.isWatch && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  Watch (50% absences)
                </span>
              )}
              {selectedStudent.hasStreak && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  <Flame className="h-3.5 w-3.5" />
                  {selectedStudent.consecutiveAbsences} Consecutive Absences
                </span>
              )}
              {selectedStudent.hasScheduleConflict && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  Schedule Conflict
                </span>
              )}
            </div>

            {/* Session Timeline Breakdown */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-text-primary">
                Session Roll Call History
              </span>
              <div className="rounded-xl border border-border bg-surface-2/60 divide-y divide-border/60 max-h-56 overflow-y-auto">
                {Object.entries(selectedStudent.sessionMarks).length > 0 ? (
                  Object.entries(selectedStudent.sessionMarks)
                    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                    .map(([date, mark]) => (
                      <div
                        key={date}
                        className="flex items-center justify-between p-2.5 text-xs"
                      >
                        <span className="font-mono font-medium text-text-primary">
                          {date}
                        </span>
                        <span>
                          {mark === 'P' && (
                            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              Present (P)
                            </span>
                          )}
                          {mark === 'E' && (
                            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                              Excused (E)
                            </span>
                          )}
                          {mark === 'C' && (
                            <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                              Conflict (C)
                            </span>
                          )}
                          {mark === 'A' && (
                            <span className="text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                              Absent (A)
                            </span>
                          )}
                          {mark === '—' && (
                            <span className="text-[11px] text-text-tertiary">
                              Not enrolled yet (—)
                            </span>
                          )}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="p-4 text-center text-xs text-text-tertiary">
                    No sessions held yet.
                  </div>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedStudent(null)}
              className="w-full text-xs font-semibold min-h-[44px] mt-2"
            >
              Done
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
