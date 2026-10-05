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

  const {
    subject,
    heldSessionsCount,
    heldSessionDates,
    sessionSummaries,
    monitoringSummary,
    preparedByName,
    datePrepared,
    students,
    range,
  } = report

  return (
    <main className="min-h-screen bg-canvas text-text-primary px-4 py-8 max-w-5xl mx-auto flex flex-col gap-6 print:bg-white print:p-0 print:max-w-none">
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
          heldSessionDates={heldSessionDates}
          sessionSummaries={sessionSummaries}
          monitoringSummary={monitoringSummary}
          preparedByName={preparedByName}
          datePrepared={datePrepared}
          students={students}
        />
      </React.Suspense>

      <footer className="mt-8 text-center text-xs text-text-quaternary print:hidden">
        SuperSec · Automated class secretary ledger
      </footer>
    </main>
  )
}
