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

  // Query counts for tabs
  const [sessionsRes, enrollmentsRes, requestsRes] = await Promise.all([
    payload.find({
      collection: 'sessions',
      where: { subject: { equals: subject.id } },
      limit: 1,
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
      limit: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'requests',
      where: {
        and: [
          { subject: { equals: subject.id } },
          { status: { equals: 'pending' } },
        ],
      },
      limit: 1,
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

  return (
    <SubjectHomeView
      header={header}
      todayDate={todayDate}
      counts={{
        sessions: sessionsRes.totalDocs,
        students: enrollmentsRes.totalDocs,
        pendingRequests: requestsRes.totalDocs,
      }}
    />
  )
}
