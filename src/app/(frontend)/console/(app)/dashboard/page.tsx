import * as React from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getActiveTerm } from '@/lib/data/terms'
import {
  getTodayClasses,
  matchExistingSession,
  getWeekdayAbbrev,
  computeDashboardMetrics,
} from '@/lib/dashboard-helpers'
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
  let flaggedStudentsCount = 0

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

    const subjectIds = (subjectsRes.docs as any[]).map((s) => s.id)

    const [todaySessionsRes, allEnrollmentsRes, allPublishedSessionsRes] = await Promise.all([
      payload.find({
        collection: 'sessions',
        where: {
          date: { equals: todayDate },
        },
        limit: 100,
        overrideAccess: true,
      }),
      subjectIds.length > 0
        ? payload.find({
            collection: 'enrollments',
            where: {
              and: [
                { subject: { in: subjectIds } },
                { status: { equals: 'active' } },
              ],
            },
            depth: 1,
            limit: 1000,
            overrideAccess: true,
          })
        : { docs: [] as any[] },
      subjectIds.length > 0
        ? payload.find({
            collection: 'sessions',
            where: {
              and: [
                { subject: { in: subjectIds } },
                { _status: { equals: 'published' } },
              ],
            },
            limit: 500,
            overrideAccess: true,
          })
        : { docs: [] as any[] },
    ])

    const scheduled = getTodayClasses(subjectsRes.docs as any[], todayWeekday)

    todayClasses = scheduled.map((sc) => {
      const existing = matchExistingSession(todaySessionsRes.docs as any[], sc.subject.id, todayDate)
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

    const studentCountMap = new Map<string, number>()
    for (const enr of allEnrollmentsRes.docs as any[]) {
      const sId = typeof enr.subject === 'object' && enr.subject !== null ? enr.subject.id : enr.subject
      studentCountMap.set(sId, (studentCountMap.get(sId) || 0) + 1)
    }

    const metrics = computeDashboardMetrics({
      subjects: subjectsRes.docs,
      enrollments: allEnrollmentsRes.docs,
      sessions: allPublishedSessionsRes.docs,
    })

    flaggedStudentsCount = metrics.totalFlaggedCount

    allSubjects = (subjectsRes.docs as any[]).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      sectionMark: s.sectionMark,
      professor: s.professor,
      slug: s.slug,
      schedule: s.schedule || [],
      studentCount: studentCountMap.get(s.id) || 0,
      flaggedCount: metrics.subjectFlaggedCounts[s.id] || 0,
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
      flaggedStudentsCount={flaggedStudentsCount}
      activeTermName={activeTerm?.name}
    />
  )
}
