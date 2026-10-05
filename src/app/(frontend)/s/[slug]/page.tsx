import * as React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getPublicSubjectPageData } from '@/lib/data/public-views'
import { PublicSessionsView } from '@/components/classmate/public-sessions-view'
import { Badge } from '@/components/ui/badge'
import { BookOpen, MapPin, Video, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Subject Attendance · SuperSec',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function PublicSubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!slug) {
    notFound()
  }

  const payload = await getPayload({ config })
  const data = await getPublicSubjectPageData(payload, slug)

  if (!data) {
    notFound()
  }

  const { subject, sessions, roster } = data

  return (
    <main className="min-h-screen bg-canvas text-text-primary px-4 py-8 max-w-2xl mx-auto flex flex-col gap-6">
      {/* Subject Header */}
      <header className="flex flex-col gap-3 p-5 rounded-2xl border border-border bg-surface-1 shadow-2">
        <div className="flex items-center justify-between gap-2">
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
          <span className="text-xs text-text-tertiary">Unlisted Public View</span>
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            {subject.name}
          </h1>
          {subject.professor && (
            <p className="text-xs text-text-secondary mt-0.5">
              Prof. {subject.professor}
            </p>
          )}
        </div>

        {/* Schedule & Location Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs text-text-secondary">
          {subject.schedule && subject.schedule.length > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-text-quaternary" />
              <span>
                {subject.schedule.map((s: any) => `${s.day} ${s.startTime}-${s.endTime}`).join(', ')}
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
              className="inline-flex items-center gap-1 text-brand-text hover:underline"
            >
              <Video className="h-3.5 w-3.5" />
              <span>Zoom Link</span>
            </a>
          )}
        </div>
      </header>

      {/* Published Sessions & Dispute Trigger */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Class Sessions ({sessions.length})
          </h2>
          <span className="text-xs text-text-secondary">
            {roster.length} active classmates
          </span>
        </div>

        <PublicSessionsView
          subjectId={subject.id}
          sessions={sessions}
          roster={roster}
        />
      </section>

      {/* Footer Disclaimer */}
      <footer className="mt-8 text-center text-xs text-text-quaternary">
        SuperSec · Automated class secretary ledger
      </footer>
    </main>
  )
}
