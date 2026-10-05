'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Search,
  ImageIcon,
  AlertCircle,
  Inbox,
  Filter,
} from 'lucide-react'
import type { SubjectRequestItem } from '@/lib/subjects/subject-home'

interface SubjectFilterOption {
  id: string
  code: string
  name: string
}

interface RequestsQueueViewProps {
  initialRequests: SubjectRequestItem[]
  subjects: SubjectFilterOption[]
}

export function RequestsQueueView({ initialRequests, subjects }: RequestsQueueViewProps) {
  const [requests, setRequests] = React.useState<SubjectRequestItem[]>(initialRequests)
  const [statusFilter, setStatusFilter] = React.useState<'pending' | 'approved' | 'declined' | 'all'>('pending')
  const [subjectFilter, setSubjectFilter] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState<string>('')
  const [reviewingId, setReviewingId] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [selectedProof, setSelectedProof] = React.useState<{ url: string; title: string } | null>(null)

  const handleReviewRequest = async (requestId: string, decision: 'approved' | 'declined', note?: string) => {
    setReviewingId(requestId)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/requests/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, decision, note }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to review request')
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: decision, decidedAt: new Date().toISOString(), decisionNote: note }
            : r,
        ),
      )
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating request')
    } finally {
      setReviewingId(null)
    }
  }

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    // Status
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    // Subject
    if (subjectFilter !== 'all' && r.subjectId !== subjectFilter) return false
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = r.studentName.toLowerCase().includes(q)
      const matchNum = r.studentNumber?.toLowerCase().includes(q)
      const matchSub = (r.subjectCode || '').toLowerCase().includes(q)
      if (!matchName && !matchNum && !matchSub) return false
    }
    return true
  })

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const declinedCount = requests.filter((r) => r.status === 'declined').length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Request Queue</h1>
          <p className="text-xs text-text-secondary mt-1">
            Review and resolve student disputes, excuse letters, and recitation claims.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 self-start sm:self-auto">
            <Clock className="h-3.5 w-3.5" />
            <span>{pendingCount} pending review</span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2.5 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
            {errorMessage.includes('Rule R3') && (
              <p className="text-[11px] text-red-300 mt-1">
                Please open the session in Roll Call to either publish or discard the draft edits before approving requests.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-text-tertiary hover:text-text-primary text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { id: 'pending', label: 'Pending', count: pendingCount },
              { id: 'approved', label: 'Approved', count: approvedCount },
              { id: 'declined', label: 'Declined', count: declinedCount },
              { id: 'all', label: 'All', count: requests.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[38px] ${
                statusFilter === tab.id
                  ? 'bg-brand text-on-brand'
                  : 'bg-surface-2 text-text-secondary hover:text-text-primary border border-border'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-surface-3 text-text-tertiary'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Subject Filter & Search */}
        <div className="flex items-center gap-2 flex-1">
          {subjects.length > 1 && (
            <div className="relative shrink-0">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-10 min-h-[40px] px-3 rounded-lg border border-border bg-surface-1 text-xs text-text-primary font-medium focus:border-brand focus:outline-none"
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or subject..."
              className="w-full h-10 min-h-[40px] rounded-lg border border-border bg-surface-1 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-3 hover:border-border-hover transition-colors"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-text-primary">{req.studentName}</span>
                  {req.studentNumber && (
                    <span className="font-mono text-[11px] text-text-tertiary">{req.studentNumber}</span>
                  )}
                  {req.subjectCode && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-2 text-text-secondary border border-border">
                      {req.subjectCode}
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

                <div className="flex items-center gap-2 text-xs text-text-tertiary shrink-0">
                  {req.sessionDate && (
                    <span className="font-mono text-[11px] text-text-secondary">
                      Session: {req.sessionDate}
                    </span>
                  )}
                  <span>·</span>
                  <span className="text-[11px]">
                    {new Date(req.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  {req.reason && (
                    <p className="text-xs text-text-primary bg-surface-2/60 p-2.5 rounded-lg border border-border/60">
                      <span className="text-text-tertiary font-medium block text-[10px] uppercase tracking-wider mb-0.5">
                        Excuse Reason:
                      </span>
                      {req.reason}
                    </p>
                  )}

                  {req.topic && (
                    <p className="text-xs text-text-primary bg-surface-2/60 p-2.5 rounded-lg border border-border/60">
                      <span className="text-text-tertiary font-medium block text-[10px] uppercase tracking-wider mb-0.5">
                        Recited Topic:
                      </span>
                      {req.topic}
                    </p>
                  )}

                  {req.decisionNote && (
                    <p className="text-xs text-text-secondary italic">
                      Secretary Note: {req.decisionNote}
                    </p>
                  )}

                  {req.proofUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedProof({
                          url: req.proofUrl!,
                          title: `Proof from ${req.studentName}`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline mt-1 self-start font-medium"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Inspect attached proof screenshot</span>
                    </button>
                  )}
                </div>

                {/* Card Actions */}
                <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        disabled={reviewingId === req.id}
                        onClick={() => handleReviewRequest(req.id, 'declined')}
                        className="inline-flex items-center justify-center min-h-[44px] px-3.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1 text-red-400/80" />
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={reviewingId === req.id}
                        onClick={() => handleReviewRequest(req.id, 'approved')}
                        className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-brand hover:bg-brand-hover text-xs font-semibold text-on-brand shadow-sm transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {req.status === 'approved' ? (
                        <span className="inline-flex items-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-text-tertiary bg-surface-2 border border-border px-2.5 py-1 rounded-md">
                          <XCircle className="h-3.5 w-3.5 mr-1 text-red-400" />
                          Declined
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-1 p-10 text-center text-xs text-text-secondary">
          <Inbox className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-60" />
          <p className="font-semibold text-text-primary">No requests found</p>
          <p className="mt-1">
            {statusFilter === 'pending'
              ? 'Your queue is clear! No classmate submissions are waiting for review.'
              : `No requests with status "${statusFilter}".`}
          </p>
        </div>
      )}

      {/* Proof Preview Modal */}
      {selectedProof && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedProof.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedProof(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-surface-1 border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-2/50">
              <span className="text-xs font-semibold text-text-primary">
                {selectedProof.title}
              </span>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
                aria-label="Close proof preview"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedProof.url}
                alt={selectedProof.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg border border-border/50"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
