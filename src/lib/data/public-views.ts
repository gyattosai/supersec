import type { Payload } from 'payload'
import { getPublicSubject } from './subjects'
import { formatStudentDisplayName } from './students'

export interface PublicStudentInfo {
  id: string
  name: string
}

export interface PublicSessionEntry {
  student: PublicStudentInfo
  attendance: 'P' | 'A' | 'E' | 'C' | null
  recitations: number
}

export interface PublicSessionInfo {
  id: string
  date: string
  entries: PublicSessionEntry[]
}

export interface PublicSubjectPageData {
  subject: {
    id: string
    code: string
    name: string
    slug: string
    professor?: string
    schedule: any[]
    sectionMark?: string
    sectionFull?: string
    room?: string
    zoomUrl?: string
  }
  sessions: PublicSessionInfo[]
  roster: PublicStudentInfo[]
}

export async function getPublicSubjectPageData(
  payload: Payload,
  slug: string,
): Promise<PublicSubjectPageData | null> {
  // 1. Fetch public subject (enforcing PUBLIC_SUBJECT_FIELDS allowlist)
  const subjectDoc = (await getPublicSubject(payload, slug)) as any
  if (!subjectDoc) {
    return null
  }

  const subjectId = subjectDoc.id

  // 2. Fetch published sessions only
  const sessionsRes = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { subject: { equals: subjectId } },
        { _status: { equals: 'published' } },
        { kind: { not_equals: 'noClass' } },
      ],
    },
    depth: 2,
    limit: 100,
    overrideAccess: true,
  })

  // Sort sessions chronologically descending (latest session first)
  const sortedSessions = [...(sessionsRes.docs as any[])].sort((a, b) =>
    b.date.localeCompare(a.date),
  )

  // 3. Project session entries with strict zero-leak allowlist (ADR 0002)
  const sessions: PublicSessionInfo[] = sortedSessions.map((sess) => {
    const entries: PublicSessionEntry[] = (sess.entries || []).map((e: any) => {
      const studentObj = typeof e.student === 'object' && e.student !== null ? e.student : null
      const studentId = studentObj ? studentObj.id : e.student
      const studentName = formatStudentDisplayName(studentObj)

      return {
        student: {
          id: studentId,
          name: studentName,
        },
        attendance: e.attendance ?? null,
        recitations: e.recitations || 0,
        // Notice: excuseReason, proofStorageId, proofUrl, internalNote are completely omitted!
      }
    })

    return {
      id: sess.id,
      date: sess.date,
      entries,
    }
  })

  // 4. Fetch roster of active students for dispute student selector
  const enrollmentsRes = await payload.find({
    collection: 'enrollments',
    where: {
      and: [
        { subject: { equals: subjectId } },
        { status: { equals: 'active' } },
      ],
    },
    depth: 1,
    limit: 200,
    overrideAccess: true,
  })

  const rosterMap = new Map<string, string>()
  for (const enr of enrollmentsRes.docs as any[]) {
    const s = typeof enr.student === 'object' && enr.student !== null ? enr.student : null
    if (s && s.id) {
      rosterMap.set(s.id, formatStudentDisplayName(s))
    }
  }

  const roster: PublicStudentInfo[] = Array.from(rosterMap.entries()).map(([id, name]) => ({
    id,
    name,
  }))

  // Sort roster alphabetically by name
  roster.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

  return {
    subject: {
      id: subjectDoc.id,
      code: subjectDoc.code,
      name: subjectDoc.name,
      slug: subjectDoc.slug,
      professor: subjectDoc.professor,
      schedule: subjectDoc.schedule || [],
      sectionMark: subjectDoc.sectionMark,
      sectionFull: subjectDoc.sectionFull,
      room: subjectDoc.room,
      zoomUrl: subjectDoc.zoomUrl,
    },
    sessions,
    roster,
  }
}
