import * as React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getProfessorReport } from '@/lib/data/reports'
import { ProfessorReportView } from '@/components/professor/professor-report-view'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, BookOpen, Clock, Users, CalendarCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Attendance Report · SuperSec',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ProfessorReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ fromDate?: string; toDate?: string }>
}) {
  const { token } = await params
  if (!token) {
    notFound()
  }

  const { fromDate, toDate } = await searchParams
  const payload = await getPayload({ config })
  const report = await getProfessorReport(payload, token, { fromDate, toDate })

  if (report.status === 'not_found') {
    notFound()
  }

  if (report.status === 'revoked') {
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(report.revokedAt))

    return (
      <main className="min-h-screen bg-canvas text-text-primary px-4 py-16 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
        <div className="p-6 rounded-2xl border border-warning/30 bg-surface-1 shadow-2 flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-warning/15 text-warning flex items-center justify-center">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">
              Report Link Revoked
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              This secret report link was revoked on <span className="font-semibold text-text-primary">{formattedDate}</span>.
            </p>
          </div>
          <p className="text-xs text-text-tertiary">
            Please ask the class secretary to issue a renewed report link.
          </p>
        </div>
      </main>
    )
  }

  const { subject, heldSessionsCount, students, range } = report

  return (
    <main className="min-h-screen bg-canvas text-text-primary px-4 py-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border bg-surface-1 shadow-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-brand-tint text-brand-text">
              {subject.code}
            </span>
            {subject.section && (
              <Badge variant="neutral">
                Sec {subject.section}
              </Badge>
            )}
            <Badge variant="brand">
              Professor View
            </Badge>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            {subject.name}
          </h1>

          <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
            {subject.room && <span>Room: {subject.room}</span>}
            {subject.scheduleDays && subject.scheduleDays.length > 0 && (
              <span>Schedule: {subject.scheduleDays.join(', ')}</span>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-5">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-xs text-text-quaternary">
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Held</span>
            </div>
            <span className="text-lg font-bold text-text-primary">
              {heldSessionsCount}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-xs text-text-quaternary">
              <Users className="h-3.5 w-3.5" />
              <span>Students</span>
            </div>
            <span className="text-lg font-bold text-text-primary">
              {students.length}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-xs text-text-quaternary">
              <Clock className="h-3.5 w-3.5" />
              <span>Absence Limit</span>
            </div>
            <span className="text-lg font-bold text-text-primary">
              {subject.absenceLimit}
            </span>
          </div>
        </div>
      </header>

      {/* Main Professor Report Table & Controls */}
      <React.Suspense
        fallback={
          <div className="p-8 text-center text-xs text-text-tertiary rounded-xl border border-border bg-surface-1">
            Loading report table...
          </div>
        }
      >
        <ProfessorReportView
          token={token}
          subject={subject}
          range={range}
          heldSessionsCount={heldSessionsCount}
          students={students}
        />
      </React.Suspense>

      <footer className="mt-8 text-center text-xs text-text-quaternary">
        SuperSec · Automated class secretary ledger
      </footer>
    </main>
  )
}
