'use client'

import * as React from 'react'
import { Sparkles, Check, AlertTriangle, ArrowLeft, Users, Calendar } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  type CleanedStudentRecord,
  type RosterCleanResult,
} from '@/lib/ai/roster-cleaner'

export interface RosterImportAssistantProps {
  open: boolean
  onClose: () => void
  subjectId: string
  subjectCode: string
  onImportComplete?: () => void
}

export function RosterImportAssistant({
  open,
  onClose,
  subjectId,
  subjectCode,
  onImportComplete,
}: RosterImportAssistantProps) {
  const [step, setStep] = React.useState<'input' | 'preview'>('input')
  const [rawText, setRawText] = React.useState('')
  const [enrolledOn, setEnrolledOn] = React.useState(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()),
  )
  const [loading, setLoading] = React.useState(false)
  const [enrolling, setEnrolling] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<RosterCleanResult | null>(null)

  const [selectedIndices, setSelectedIndices] = React.useState<Set<number>>(new Set())

  React.useEffect(() => {
    if (open) {
      setStep('input')
      setError(null)
      setSuccessMsg(null)
      setResult(null)
      setSelectedIndices(new Set())
    }
  }, [open])

  const handleClean = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawText.trim()) {
      setError('Please paste raw student list.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/clean-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to parse roster text.')
        return
      }

      const cleanRes: RosterCleanResult = data.result || {
        students: [],
        duplicateCount: 0,
        totalProcessed: 0,
      }

      setResult(cleanRes)

      // Pre-select all non-duplicate students
      const initialSelected = new Set<number>()
      cleanRes.students.forEach((s, idx) => {
        if (!s.isDuplicate) {
          initialSelected.add(idx)
        }
      })
      setSelectedIndices(initialSelected)
      setStep('preview')
    } catch {
      setError('Connection failed. Please check your network and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  const handleConfirmEnrollment = async () => {
    if (!result) return

    const studentsToEnroll = result.students
      .filter((_, idx) => selectedIndices.has(idx))
      .map((s) => ({
        lastName: s.lastName,
        firstName: s.firstName,
        middleName: s.middleName,
        studentNumber: s.studentNumber,
      }))

    if (studentsToEnroll.length === 0) {
      setError('Please select at least one student to enroll.')
      return
    }

    setError(null)
    setEnrolling(true)

    try {
      const res = await fetch(`/api/subjects/${subjectId}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: studentsToEnroll,
          enrolledOn,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to enroll students.')
        return
      }

      setSuccessMsg(`Successfully enrolled ${data.enrolledCount} students into ${subjectCode}!`)
      setTimeout(() => {
        onImportComplete?.()
        onClose()
      }, 1000)
    } catch {
      setError('Connection failed. Please check your network and try again.')
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={step === 'input' ? `Import Roster · ${subjectCode}` : 'Review & Confirm Roster'}
      description={
        step === 'input'
          ? 'Paste messy student lists from spreadsheets, LMS, or chat. AI will standardize names and detect duplicates.'
          : 'Inspect cleaned names and student numbers before finalizing enrollment.'
      }
    >
      <div className="flex flex-col gap-4 py-2">
        {error && (
          <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg border border-success/30 bg-success/10 text-xs text-success">
            {successMsg}
          </div>
        )}

        {step === 'input' ? (
          <form onSubmit={handleClean} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="enrolledOn" className="text-xs font-medium text-text-secondary select-none flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-text-quaternary" />
                <span>Enrolled On Date</span>
              </label>
              <input
                id="enrolledOn"
                type="date"
                required
                value={enrolledOn}
                onChange={(e) => setEnrolledOn(e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-xs text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="rawRoster" className="text-xs font-medium text-text-secondary select-none">
                Raw Student List (one per line)
              </label>
              <textarea
                id="rawRoster"
                rows={8}
                required
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="e.g.&#10;1. BSCS-2A DELA CRUZ, Juan Miguel - 2023-0001&#10;2. Maria Clara Santos&#10;3. Mr. Pedro Penduko (BSIT) - 20230003"
                className="w-full rounded-lg border border-border bg-surface-2 p-3 text-xs font-mono text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="mt-2 w-full font-semibold"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Clean & Parse Roster with AI
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Summary Banner */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2 text-xs">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-text" />
                <span className="font-semibold text-text-primary">
                  {selectedIndices.size} of {result?.students.length} selected
                </span>
              </div>

              {result && result.duplicateCount > 0 && (
                <Badge variant="warning" className="text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {result.duplicateCount} duplicate(s) flagged
                </Badge>
              )}
            </div>

            {/* Students Table */}
            <div className="flex flex-col gap-1.5">
              {result?.students.map((stu, idx) => {
                const isChecked = selectedIndices.has(idx)
                return (
                  <label
                    key={idx}
                    className={`flex items-start justify-between p-2.5 rounded-lg border transition-colors cursor-pointer select-none ${
                      stu.isDuplicate
                        ? 'border-warning/40 bg-warning/5'
                        : 'border-border bg-surface-2 hover:border-brand/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleIndex(idx)}
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand mt-0.5 bg-surface-1"
                      />

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-text-primary">
                            {stu.lastName}, {stu.firstName}
                          </span>
                          {stu.middleName && (
                            <span className="text-xs text-text-secondary">
                              {stu.middleName}
                            </span>
                          )}
                          {stu.studentNumber && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-text-tertiary">
                              {stu.studentNumber}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-text-quaternary font-mono truncate mt-0.5">
                          Raw: &quot;{stu.rawLine}&quot;
                        </span>

                        {stu.isDuplicate && (
                          <span className="text-[10px] text-warning font-medium mt-0.5">
                            {stu.duplicateReason || 'Potential duplicate'}
                          </span>
                        )}
                      </div>
                    </div>

                    {stu.isDuplicate ? (
                      <Badge variant="warning" className="text-[10px] shrink-0">
                        Duplicate
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[10px] shrink-0">
                        #{idx + 1}
                      </Badge>
                    )}
                  </label>
                )
              })}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setStep('input')}
                className="text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>

              <Button
                type="button"
                variant="primary"
                size="default"
                loading={enrolling}
                disabled={selectedIndices.size === 0}
                onClick={handleConfirmEnrollment}
                className="text-xs font-semibold flex-1"
              >
                Confirm & Enroll ({selectedIndices.size})
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
