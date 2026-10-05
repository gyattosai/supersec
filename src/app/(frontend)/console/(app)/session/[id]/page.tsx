import * as React from 'react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { formatStudentDisplayName } from '@/lib/data/students'
import { RollCallRunner } from '@/components/console/roll-call-runner'

interface SessionPageProps {
  params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id: sessionId } = await params
  const payload = await getPayload({ config })

  const sessionRes = await payload.find({
    collection: 'sessions',
    where: { id: { equals: sessionId } },
    depth: 2,
    overrideAccess: true,
  })

  if (!sessionRes.docs || sessionRes.docs.length === 0) {
    notFound()
  }

  const sessionDoc = sessionRes.docs[0] as any
  const subjectObj =
    typeof sessionDoc.subject === 'object' && sessionDoc.subject !== null
      ? sessionDoc.subject
      : null

  let subjectDoc = subjectObj

  if (!subjectDoc) {
    const subjRes = await payload.find({
      collection: 'subjects',
      where: { id: { equals: sessionDoc.subject } },
      limit: 1,
      overrideAccess: true,
    })
    subjectDoc = subjRes.docs?.[0]
  }

  if (!subjectDoc) {
    notFound()
  }

  const serializedSession = {
    id: sessionDoc.id,
    date: sessionDoc.date,
    _status: sessionDoc._status,
    entries: (sessionDoc.entries || []).map((e: any) => ({
      student: {
        id: typeof e.student === 'object' && e.student !== null ? e.student.id : e.student,
        name: formatStudentDisplayName(e.student),
        studentNumber:
          typeof e.student === 'object' && e.student !== null ? e.student.studentNumber : undefined,
      },
      attendance: e.attendance ?? null,
      recitations: e.recitations || 0,
      excuseReason: e.excuseReason,
    })),
  }

  const serializedSubject = {
    id: subjectDoc.id,
    code: subjectDoc.code,
    name: subjectDoc.name,
    sectionMark: subjectDoc.sectionMark,
  }

  return <RollCallRunner session={serializedSession} subject={serializedSubject} />
}
