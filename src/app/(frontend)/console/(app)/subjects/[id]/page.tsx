import * as React from 'react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { SubjectHomeView } from '@/components/console/subject-home-view'
import { projectSubjectHomeHeader } from '@/lib/subjects/subject-home'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SubjectHomePage({ params }: PageProps) {
  const { id } = await params
  const payload = await getPayload({ config })

  // Find subject by ID or slug
  let subject: any = null
  try {
    subject = await payload.findByID({
      collection: 'subjects',
      id,
      overrideAccess: true,
    })
  } catch {
    // If findByID fails, try finding by slug
    const res = await payload.find({
      collection: 'subjects',
      where: { slug: { equals: id } },
      limit: 1,
      overrideAccess: true,
    })
    subject = res.docs[0] || null
  }

  if (!subject) {
    notFound()
  }

  // Get current Manila date and time
  const now = new Date()
  const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now)
  const currentTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)

  // Query data for tabs
  const [sessionsRes, enrollmentsRes, requestsRes] = await Promise.all([
    payload.find({
      collection: 'sessions',
      where: { subject: { equals: subject.id } },
      limit: 200,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { subject: { equals: subject.id } },
          { dropped: { not_equals: true } },
        ],
      },
      depth: 1,
      limit: 200,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'requests',
      where: {
        subject: { equals: subject.id },
      },
      depth: 1,
      limit: 100,
      overrideAccess: true,
    }),
  ])

  const header = projectSubjectHomeHeader(
    {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      sectionMark: subject.sectionMark,
      professor: subject.professor,
      slug: subject.slug,
      schedule: subject.schedule,
    },
    todayDate,
    currentTime,
  )

  const {
    projectSubjectSessionsList,
    projectSubjectRosterList,
    projectSubjectRequestsList,
  } = await import('@/lib/subjects/subject-home')
  const { computeAbsenteeMonitoring } = await import('@/lib/stats/absentee-monitoring')

  const sessions = projectSubjectSessionsList(sessionsRes.docs)
  const roster = projectSubjectRosterList(enrollmentsRes.docs)
  const requests = projectSubjectRequestsList(requestsRes.docs)
  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length

  const monitoringEnrollments = enrollmentsRes.docs.map((enr: any) => {
    const student = typeof enr.student === 'object' && enr.student !== null ? enr.student : {}
    return {
      id: enr.id,
      studentId: student.id || enr.student,
      name: student.name || 'Unnamed Student',
      studentNumber: student.studentNumber,
      sectionMark: enr.sectionMark,
      hasScheduleConflict: Boolean(enr.hasScheduleConflict),
      enrolledOn: enr.enrolledOn,
      dropped: Boolean(enr.dropped),
      droppedOn: enr.droppedOn,
      displayOrder: enr.displayOrder,
    }
  })

  const monitoringSessions = sessionsRes.docs.map((s: any) => ({
    id: s.id,
    date: s.date,
    kind: (s.kind || 'class') as 'class' | 'noClass',
    entries: (s.entries || []).map((e: any) => ({
      studentId: typeof e.student === 'object' && e.student !== null ? e.student.id : e.student,
      attendance: e.attendance,
      recitations: e.recitations,
    })),
  }))

  const monitoring = computeAbsenteeMonitoring({
    enrollments: monitoringEnrollments,
    sessions: monitoringSessions,
    absenceLimit: subject.absenceLimit ?? 4,
    subjectId: subject.id,
  })

  return (
    <SubjectHomeView
      header={header}
      todayDate={todayDate}
      sessions={sessions}
      roster={roster}
      requests={requests}
      monitoring={monitoring}
      counts={{
        sessions: sessionsRes.totalDocs,
        students: enrollmentsRes.totalDocs,
        pendingRequests: pendingRequestsCount,
        flaggedStudents: monitoring.totalFlaggedCount,
      }}
    />
  )
}
