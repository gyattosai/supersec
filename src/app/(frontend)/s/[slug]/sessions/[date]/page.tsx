import * as React from 'react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getPublicSessionPageData } from '@/lib/data/public-views'
import { resolveLegacySubjectRedirect } from '@/lib/data/legacy-redirects'
import { PublicSessionDetailView } from '@/components/classmate/public-session-detail-view'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; date: string }>
}): Promise<Metadata> {
  const { slug, date } = await params
  const payload = await getPayload({ config })
  const data = await getPublicSessionPageData(payload, slug, date)

  if (!data) {
    return {
      title: 'Session Not Found · SuperSec',
      robots: { index: false, follow: false },
    }
  }

  return {
    title: `${data.subject.code} · Attendance ${data.session.date} · SuperSec`,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function PublicSessionPage({
  params,
}: {
  params: Promise<{ slug: string; date: string }>
}) {
  const { slug, date } = await params
  if (!slug || !date) {
    notFound()
  }

  const payload = await getPayload({ config })
  const data = await getPublicSessionPageData(payload, slug, date)

  if (!data) {
    const legacyRedirect = await resolveLegacySubjectRedirect(payload, slug)
    if (legacyRedirect) {
      permanentRedirect(`${legacyRedirect.destination}/sessions/${date}`)
    }
    notFound()
  }

  return (
    <main className="min-h-screen bg-canvas text-text-primary px-4 py-8 max-w-2xl mx-auto flex flex-col gap-6">
      <PublicSessionDetailView data={data} />
    </main>
  )
}
