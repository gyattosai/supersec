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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import type { SubjectHomeHeaderData } from '@/lib/subjects/subject-home'

export type SubjectHomeTab = 'sessions' | 'roster' | 'requests' | 'monitoring' | 'reports'

interface SubjectHomeViewProps {
  header: SubjectHomeHeaderData
  todayDate: string
  counts?: {
    sessions?: number
    students?: number
    pendingRequests?: number
  }
}

export function SubjectHomeView({ header, todayDate, counts }: SubjectHomeViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SubjectHomeTab>('sessions')
  const [startingSession, setStartingSession] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

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
          <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-xs text-text-secondary">
            <Calendar className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-60" />
            <p className="font-medium text-text-primary">Sessions Management</p>
            <p className="mt-1">Full sessions list and history view (Ticket 02).</p>
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-xs text-text-secondary">
            <Users className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-60" />
            <p className="font-medium text-text-primary">Enrolled Student Roster</p>
            <p className="mt-1">Searchable student list and conflict tags (Ticket 02).</p>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-xs text-text-secondary">
            <Inbox className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-60" />
            <p className="font-medium text-text-primary">Classmate Requests Queue</p>
            <p className="mt-1">Pending excuses and recitation dispute review (Ticket 04).</p>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-xs text-text-secondary">
            <AlertTriangle className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-60" />
            <p className="font-medium text-text-primary">Absentee Monitoring</p>
            <p className="mt-1">Flagged students and absence threshold warnings (Ticket 06).</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-xs text-text-secondary">
            <FileText className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-60" />
            <p className="font-medium text-text-primary">Professor Reports</p>
            <p className="mt-1">Token generation and Prelims report export (Ticket 07 & 08).</p>
          </div>
        )}
      </div>

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
    </div>
  )
}
