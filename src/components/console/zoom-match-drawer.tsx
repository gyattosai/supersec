'use client'

import * as React from 'react'
import { Sparkles, Check, AlertCircle, HelpCircle, ArrowLeft } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  type ZoomMatchInputStudent,
  type ZoomMatchResult,
} from '@/lib/ai/zoom-match'

export interface ZoomMatchDrawerProps {
  open: boolean
  onClose: () => void
  roster: ZoomMatchInputStudent[]
  onApplyMatches: (selectedStudentIds: string[]) => void
}

export function ZoomMatchDrawer({
  open,
  onClose,
  roster,
  onApplyMatches,
}: ZoomMatchDrawerProps) {
  const [step, setStep] = React.useState<'input' | 'review'>('input')
  const [rawText, setRawText] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<ZoomMatchResult | null>(null)

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [selectedAmbiguous, setSelectedAmbiguous] = React.useState<Map<string, string>>(new Map())

  // Reset state when opening/closing
  React.useEffect(() => {
    if (open) {
      setStep('input')
      setError(null)
      setResult(null)
      setSelectedIds(new Set())
      setSelectedAmbiguous(new Map())
    }
  }, [open])

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawText.trim()) {
      setError('Please paste raw Zoom text or chat logs.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/zoom-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, roster }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to analyze Zoom text.')
        return
      }

      const matchRes: ZoomMatchResult = data.result || {
        matched: [],
        ambiguous: [],
        unmatched: [],
      }

      setResult(matchRes)
      // Pre-check all high-confidence matched students
      setSelectedIds(new Set(matchRes.matched.map((m) => m.studentId)))
      setStep('review')
    } catch {
      setError('Connection failed. Please check your network and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStudent = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const handleSelectAmbiguous = (rawName: string, studentId: string) => {
    setSelectedAmbiguous((prev) => {
      const next = new Map(prev)
      if (studentId === '') {
        next.delete(rawName)
      } else {
        next.set(rawName, studentId)
      }
      return next
    })
  }

  const handleApply = () => {
    const finalIds = new Set<string>(selectedIds)
    // Add any resolved ambiguous candidates
    selectedAmbiguous.forEach((sId) => {
      if (sId) finalIds.add(sId)
    })

    onApplyMatches(Array.from(finalIds))
    onClose()
  }

  const totalToApply =
    selectedIds.size +
    Array.from(selectedAmbiguous.values()).filter(Boolean).length

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={step === 'input' ? 'Import Attendance from Zoom' : 'Review Matched Attendees'}
      description={
        step === 'input'
          ? 'Paste raw Zoom meeting chat or participant list below to automatically extract present students.'
          : 'Confirm recognized classmates before applying Present marks.'
      }
    >
      <div className="flex flex-col gap-4 py-2">
        {error && (
          <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger">
            {error}
          </div>
        )}

        {step === 'input' ? (
          <form onSubmit={handleExtract} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="zoomRaw" className="text-xs font-medium text-text-secondary select-none">
                Raw Meeting Chat or Attendee List
              </label>
              <textarea
                id="zoomRaw"
                rows={7}
                required
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste here... e.g.&#10;10:01:23 From Juan Dela Cruz to Everyone: Present po&#10;Pedro Penduko (Host)&#10;Maria Clara"
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
              Extract & Match Attendees
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Matched Attendees List */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                  Recognized Classmates ({result?.matched.length || 0})
                </span>
                <span className="text-xs text-text-secondary">
                  {selectedIds.size} selected
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {result?.matched.map((m) => {
                  const isChecked = selectedIds.has(m.studentId)
                  return (
                    <label
                      key={m.studentId}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-2 cursor-pointer hover:border-brand/40 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStudent(m.studentId)}
                          className="h-4 w-4 rounded border-border text-brand focus:ring-brand bg-surface-1"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-text-primary truncate">
                            {m.studentName}
                          </span>
                          <span className="text-[11px] text-text-quaternary truncate">
                            matched from: &quot;{m.rawName}&quot;
                          </span>
                        </div>
                      </div>

                      <Badge variant="success" className="text-[10px] shrink-0">
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                        {Math.round(m.confidence * 100)}%
                      </Badge>
                    </label>
                  )
                })}

                {result?.matched.length === 0 && (
                  <p className="text-xs text-text-tertiary italic p-3 text-center border border-dashed border-border rounded-lg">
                    No high-confidence matches found in this text.
                  </p>
                )}
              </div>
            </div>

            {/* Ambiguous Candidates */}
            {result?.ambiguous && result.ambiguous.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Ambiguous Matches ({result.ambiguous.length})</span>
                </div>

                <div className="flex flex-col gap-2">
                  {result.ambiguous.map((amb, i) => {
                    const currentSelection = selectedAmbiguous.get(amb.rawName) || ''
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-lg border border-warning/30 bg-warning/5 text-xs flex flex-col gap-2"
                      >
                        <span className="font-semibold text-text-primary">
                          Raw name: &quot;{amb.rawName}&quot;
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {amb.candidates.map((cand) => (
                            <label
                              key={cand.studentId}
                              className="inline-flex items-center gap-1.5 p-1.5 rounded bg-surface-1 border border-border cursor-pointer select-none text-[11px]"
                            >
                              <input
                                type="radio"
                                name={`amb-${i}`}
                                value={cand.studentId}
                                checked={currentSelection === cand.studentId}
                                onChange={() => handleSelectAmbiguous(amb.rawName, cand.studentId)}
                                className="h-3.5 w-3.5 text-brand"
                              />
                              <span>{cand.studentName}</span>
                            </label>
                          ))}
                          <label className="inline-flex items-center gap-1.5 p-1.5 rounded bg-surface-1 border border-border cursor-pointer select-none text-[11px] text-text-tertiary">
                            <input
                              type="radio"
                              name={`amb-${i}`}
                              value=""
                              checked={currentSelection === ''}
                              onChange={() => handleSelectAmbiguous(amb.rawName, '')}
                              className="h-3.5 w-3.5 text-text-quaternary"
                            />
                            <span>Skip</span>
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Unmatched Lines */}
            {result?.unmatched && result.unmatched.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-text-tertiary">
                  <HelpCircle className="h-3 w-3" />
                  <span>Unrecognized ({result.unmatched.length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.unmatched.slice(0, 8).map((u, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] bg-surface-3 text-text-tertiary font-mono"
                    >
                      {u}
                    </span>
                  ))}
                  {result.unmatched.length > 8 && (
                    <span className="text-[10px] text-text-quaternary">
                      +{result.unmatched.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Review Actions */}
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
                disabled={totalToApply === 0}
                onClick={handleApply}
                className="text-xs font-semibold flex-1"
              >
                Apply Attendance ({totalToApply} Present)
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
