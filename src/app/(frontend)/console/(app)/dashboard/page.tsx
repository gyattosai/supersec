import * as React from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getActiveTerm } from '@/lib/data/terms'
import { getTodayClasses, matchExistingSession, getWeekdayAbbrev } from '@/lib/dashboard-helpers'
import { DashboardView, type TodayClassItem } from '@/components/console/dashboard-view'

export default async function DashboardPage() {
  const payload = await getPayload({ config })
  const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
  const todayWeekday = getWeekdayAbbrev(todayDate)

  const activeTerm = await getActiveTerm(payload, todayDate)
  let todayClasses: TodayClassItem[] = []

  if (activeTerm?.id) {
    const subjectsRes = await payload.find({
      collection: 'subjects',
      where: {
        and: [
          { term: { equals: activeTerm.id } },
          { archivedAt: { exists: false } },
        ],
      },
      limit: 100,
      overrideAccess: true,
    })

    const sessionsRes = await payload.find({
      collection: 'sessions',
      where: {
        date: { equals: todayDate },
      },
      limit: 100,
      overrideAccess: true,
    })

    const scheduled = getTodayClasses(subjectsRes.docs as any[], todayWeekday)

    todayClasses = scheduled.map((sc) => {
      const existing = matchExistingSession(sessionsRes.docs as any[], sc.subject.id, todayDate)
      return {
        subject: {
          id: sc.subject.id,
          code: sc.subject.code,
          name: sc.subject.name,
          sectionMark: sc.subject.sectionMark,
          room: sc.subject.room,
          zoomUrl: sc.subject.zoomUrl,
        },
        slot: sc.slot,
        existingSession: existing
          ? {
              id: existing.id,
              _status: existing._status,
              type: existing.type,
            }
          : null,
      }
    })
  }

  const pendingReqRes = await payload.find({
    collection: 'requests',
    where: {
      status: { equals: 'pending' },
    },
    limit: 1,
    overrideAccess: true,
  })

  const pendingRequestsCount = pendingReqRes.totalDocs || 0

  return (
    <DashboardView
      todayDate={todayDate}
      todayClasses={todayClasses}
      pendingRequestsCount={pendingRequestsCount}
      activeTermName={activeTerm?.name}
    />
  )
}
