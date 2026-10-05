import * as React from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getActiveTerm } from '@/lib/data/terms'
import { getTodayClasses, matchExistingSession, getWeekdayAbbrev } from '@/lib/dashboard-helpers'
import {
  DashboardView,
  type TodayClassItem,
  type SubjectOverviewItem,
} from '@/components/console/dashboard-view'

export default async function DashboardPage() {
  const payload = await getPayload({ config })
  const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
  const todayWeekday = getWeekdayAbbrev(todayDate)

  const activeTerm = await getActiveTerm(payload, todayDate)
  let todayClasses: TodayClassItem[] = []
  let allSubjects: SubjectOverviewItem[] = []

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
              kind: existing.kind,
              type: existing.type || existing.kind,
            }
          : null,
      }
    })

    const enrollmentsCountRes = await payload.find({
      collection: 'enrollments',
      where: {
        status: { equals: 'active' },
      },
      limit: 1000,
      overrideAccess: true,
    })

    const studentCountMap = new Map<string, number>()
    for (const enr of enrollmentsCountRes.docs as any[]) {
      const sId = typeof enr.subject === 'object' && enr.subject !== null ? enr.subject.id : enr.subject
      studentCountMap.set(sId, (studentCountMap.get(sId) || 0) + 1)
    }

    allSubjects = (subjectsRes.docs as any[]).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      sectionMark: s.sectionMark,
      professor: s.professor,
      slug: s.slug,
      schedule: s.schedule || [],
      studentCount: studentCountMap.get(s.id) || 0,
    }))
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
      allSubjects={allSubjects}
      pendingRequestsCount={pendingRequestsCount}
      activeTermName={activeTerm?.name}
    />
  )
}
