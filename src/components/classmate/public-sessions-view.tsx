'use client'

import * as React from 'react'
import { Calendar, HelpCircle, Check, X, AlertTriangle, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DisputeSheet } from '@/components/classmate/dispute-sheet'
import { type PublicSessionInfo, type PublicStudentInfo } from '@/lib/data/public-views'

export interface PublicSessionsViewProps {
  subjectId: string
  sessions: PublicSessionInfo[]
  roster: PublicStudentInfo[]
}

export function PublicSessionsView({
  subjectId,
  sessions,
  roster,
}: PublicSessionsViewProps) {
  const [selectedSession, setSelectedSession] = React.useState<PublicSessionInfo | null>(null)
  const [disputeOpen, setDisputeOpen] = React.useState(false)

  const handleOpenDispute = (sess: PublicSessionInfo) => {
    setSelectedSession(sess)
    setDisputeOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      {sessions.map((sess) => (
        <div
          key={sess.id}
          className="p-4 rounded-xl border border-border bg-surface-1 shadow-1 flex flex-col gap-3"
        >
          {/* Session Header */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-text" />
              <span className="text-sm font-semibold text-text-primary">
                {sess.date}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenDispute(sess)}
              className="text-xs text-text-secondary hover:text-text-primary h-8 min-h-[44px] px-2.5"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              Something wrong?
            </Button>
          </div>

          {/* Student Entries Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {sess.entries.map((entry) => {
              const att = entry.attendance
              const isPresent = att === 'P'
              const isAbsent = att === 'A'
              const isExcused = att === 'E'
              const isConflict = att === 'C'

              return (
                <div
                  key={entry.student.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-2 border border-border/50 text-xs"
                >
                  <span className="font-medium text-text-primary truncate mr-2">
                    {entry.student.name}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPresent && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-success/15 text-success">
                        <Check className="h-3 w-3" /> P
                      </span>
                    )}
                    {isAbsent && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-danger/15 text-danger">
                        <X className="h-3 w-3" /> A
                      </span>
                    )}
                    {isExcused && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-warning/15 text-warning">
                        <AlertTriangle className="h-3 w-3" /> E
                      </span>
                    )}
                    {isConflict && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-brand-tint text-brand-text" title="With Schedule Conflict">
                        C
                      </span>
                    )}
                    {att == null && (
                      <span className="text-[11px] font-medium text-text-quaternary">
                        –
                      </span>
                    )}

                    {entry.recitations > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-tint text-brand-text">
                        <Sparkles className="h-2.5 w-2.5" />
                        +{entry.recitations}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {sessions.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-dashed border-border bg-surface-1 p-6">
          <Calendar className="h-8 w-8 text-text-quaternary mx-auto mb-2" />
          <p className="text-sm font-semibold text-text-primary">
            No published sessions yet
          </p>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            Attendance records will appear here as soon as the secretary completes and publishes class roll calls.
          </p>
        </div>
      )}

      {/* Slide-up Dispute Drawer */}
      {selectedSession && (
        <DisputeSheet
          open={disputeOpen}
          onClose={() => setDisputeOpen(false)}
          subjectId={subjectId}
          sessionId={selectedSession.id}
          sessionDate={selectedSession.date}
          roster={roster}
        />
      )}
    </div>
  )
}
