import * as React from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getActiveTerm } from '@/lib/data/terms'
import { SettingsHub } from '@/components/console/settings-hub'

export const metadata: Metadata = {
  title: 'Settings & System · SuperSec',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function SettingsPage() {
  const payload = await getPayload({ config })
  const reqHeaders = await headers()
  const { user } = await payload.auth({ headers: reqHeaders })

  const [activeTermDoc, subjectsRes, studentsRes, sessionsRes] = await Promise.all([
    getActiveTerm(payload),
    payload.find({ collection: 'subjects', limit: 0, overrideAccess: true }),
    payload.find({ collection: 'students', limit: 0, overrideAccess: true }),
    payload.find({ collection: 'sessions', limit: 0, overrideAccess: true }),
  ])

  const activeTerm = activeTermDoc
    ? {
        id: String(activeTermDoc.id),
        name: activeTermDoc.name,
        startDate: activeTermDoc.startDate,
        endDate: activeTermDoc.endDate,
      }
    : null

  const stats = {
    subjectsCount: subjectsRes.totalDocs,
    studentsCount: studentsRes.totalDocs,
    sessionsCount: sessionsRes.totalDocs,
  }

  return (
    <div className="py-2">
      <SettingsHub
        userEmail={user?.email || 'secretary@supersec.local'}
        activeTerm={activeTerm}
        stats={stats}
      />
    </div>
  )
}
