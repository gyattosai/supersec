'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'

export interface DisputeSheetProps {
  open: boolean
  onClose: () => void
  subjectId: string
  sessionId: string
  sessionDate: string
  roster: Array<{ id: string; name: string }>
}

export function DisputeSheet({
  open,
  onClose,
  subjectId,
  sessionId,
  sessionDate,
  roster,
}: DisputeSheetProps) {
  const [type, setType] = React.useState<'present' | 'excuse' | 'recited'>('present')
  const [studentId, setStudentId] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [count, setCount] = React.useState(1)
  const [topic, setTopic] = React.useState('')
  const [proofUrl, setProofUrl] = React.useState('')
  const [honeypot, setHoneypot] = React.useState('')

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!studentId) {
      setError('Please select your name from the class roster')
      return
    }

    if (type === 'excuse' && !reason.trim()) {
      setError('An excuse reason is required for excuse requests')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/requests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          sessionId,
          studentId,
          type,
          reason: reason.trim() || undefined,
          count: type === 'recited' ? Number(count) || 1 : undefined,
          topic: type === 'recited' ? topic.trim() || undefined : undefined,
          proofUrl: proofUrl.trim() || undefined,
          honeypot,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetAndClose = () => {
    setSuccess(false)
    setError(null)
    setReason('')
    setTopic('')
    setProofUrl('')
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleResetAndClose}
      title="Something wrong with attendance?"
      description={`Submit a correction request for the class on ${sessionDate}.`}
    >
      {success ? (
        <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-success/15 text-success flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-text-primary">
            Request Submitted
          </h3>
          <p className="text-xs text-text-secondary max-w-xs">
            Your request has been sent to the class secretary for review. Once approved, the attendance record will update automatically.
          </p>
          <Button
            type="button"
            variant="primary"
            size="default"
            onClick={handleResetAndClose}
            className="mt-3 w-full text-xs font-semibold"
          >
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger flex items-start gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Honeypot field for anti-bot protection */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {/* Request Type Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">
              What do you want to report?
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-surface-2 border border-border">
              {(
                [
                  { id: 'present', label: 'I was present' },
                  { id: 'excuse', label: 'Excuse' },
                  { id: 'recited', label: 'I recited' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setType(tab.id)}
                  className={`py-2 px-2 text-xs font-semibold rounded-md transition-all select-none min-h-[44px] ${
                    type === tab.id
                      ? 'bg-brand text-on-brand shadow-sm'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Roster Name Selection */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="studentSelect" className="text-xs font-medium text-text-secondary">
              Select your name
            </label>
            <select
              id="studentSelect"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="h-11 min-h-[44px] rounded-lg border border-border bg-surface-2 px-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">-- Choose your name --</option>
              {roster.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Fields based on Type */}
          {type === 'excuse' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="excuseReason" className="text-xs font-medium text-text-secondary">
                  Excuse Reason (Required)
                </label>
                <textarea
                  id="excuseReason"
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Fever with medical certificate / Official school competition"
                  className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="proofUrl" className="text-xs font-medium text-text-secondary">
                  Proof Image Link (Optional)
                </label>
                <input
                  id="proofUrl"
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-11 min-h-[44px] rounded-lg border border-border bg-surface-2 px-3 text-sm text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          )}

          {type === 'recited' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="recitationCount" className="text-xs font-medium text-text-secondary">
                  Number of times recited
                </label>
                <input
                  id="recitationCount"
                  type="number"
                  min={1}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
                  className="h-11 min-h-[44px] rounded-lg border border-border bg-surface-2 px-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="recitationTopic" className="text-xs font-medium text-text-secondary">
                  Topic or Question answered (Optional)
                </label>
                <input
                  id="recitationTopic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Question on Binary Search trees"
                  className="h-11 min-h-[44px] rounded-lg border border-border bg-surface-2 px-3 text-sm text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            className="mt-2 w-full text-xs font-semibold"
          >
            Submit Request
          </Button>
        </form>
      )}
    </BottomSheet>
  )
}
