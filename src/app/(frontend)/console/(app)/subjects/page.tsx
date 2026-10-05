import * as React from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getActiveTerm } from '@/lib/data/terms'
import { computeDashboardMetrics } from '@/lib/dashboard-helpers'
import {
  SubjectsListView,
  type SubjectListItem,
} from '@/components/console/subjects-list-view'

export default async function SubjectsPage() {
  const payload = await getPayload({ config })
  const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
  const activeTerm = await getActiveTerm(payload, todayDate)

  let subjects: SubjectListItem[] = []

  if (activeTerm?.id) {
    const subjectsRes = await payload.find({
      collection: 'subjects',
      where: {
        term: { equals: activeTerm.id },
      },
      limit: 100,
      overrideAccess: true,
    })

    const subjectIds = (subjectsRes.docs as any[]).map((s) => s.id)

    const [allEnrollmentsRes, allPublishedSessionsRes] = await Promise.all([
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

    subjects = (subjectsRes.docs as any[]).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      sectionMark: s.sectionMark,
      professor: s.professor,
      slug: s.slug,
      schedule: s.schedule || [],
      studentCount: studentCountMap.get(s.id) || 0,
      flaggedCount: metrics.subjectFlaggedCounts[s.id] || 0,
      archivedAt: s.archivedAt || null,
    }))
  }

  return (
    <SubjectsListView
      subjects={subjects}
      activeTermName={activeTerm?.name}
      todayDate={todayDate}
    />
  )
}
