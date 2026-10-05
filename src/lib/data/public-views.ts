import type { Payload } from 'payload'
import { getPublicSubject } from './subjects'
import { formatStudentDisplayName } from './students'
import { projectPublicPostsHub, type PublicPostsHub } from '../posts/public-projection'

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
  kind?: 'class' | 'noClass'
  noClassReason?: string
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
  postsHub: PublicPostsHub
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

  const now = new Date()
  const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now)

  // 2. Fetch published sessions, active enrollments, announcements, resources, questions
  const [sessionsRes, enrollmentsRes, announcementsRes, resourcesRes, questionsRes] =
    await Promise.all([
      payload.find({
        collection: 'sessions',
        where: {
          and: [
            { subject: { equals: subjectId } },
            { _status: { equals: 'published' } },
          ],
        },
        depth: 2,
        limit: 100,
        overrideAccess: true,
      }),
      payload.find({
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
      }),
      payload.find({
        collection: 'announcements',
        where: {
          and: [
            { subjects: { in: [subjectId] } },
            { _status: { equals: 'published' } },
          ],
        },
        limit: 50,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'resources',
        where: {
          and: [
            { subjects: { in: [subjectId] } },
            { _status: { equals: 'published' } },
          ],
        },
        limit: 50,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'questions',
        where: {
          and: [
            { subjects: { in: [subjectId] } },
            { _status: { equals: 'published' } },
          ],
        },
        limit: 50,
        overrideAccess: true,
      }),
    ])

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
      kind: sess.kind || 'class',
      noClassReason: sess.noClassReason,
      entries,
    }
  })

  // 4. Project active roster for dispute student selector
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

  // 5. Project Public Posts Hub (Announcements, Resources, Questions, Active Pinned Alert)
  const postsHub = projectPublicPostsHub({
    announcements: announcementsRes.docs,
    resources: resourcesRes.docs,
    questions: questionsRes.docs,
    todayDate,
  })

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
    postsHub,
  }
}

export interface PublicSessionStats {
  totalStudents: number
  presentCount: number
  absentCount: number
  excusedCount: number
  conflictCount: number
  notSetCount: number
  attendanceRate: number
  totalRecitations: number
}

export interface PublicSessionPageData {
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
  session: PublicSessionInfo
  roster: PublicStudentInfo[]
  stats: PublicSessionStats
}

export async function getPublicSessionPageData(
  payload: Payload,
  slug: string,
  date: string,
): Promise<PublicSessionPageData | null> {
  // 1. Fetch public subject (enforcing PUBLIC_SUBJECT_FIELDS allowlist)
  const subjectDoc = (await getPublicSubject(payload, slug)) as any
  if (!subjectDoc) {
    return null
  }

  const subjectId = subjectDoc.id

  // 2. Fetch published session for this date + subject
  const [sessionsRes, enrollmentsRes] = await Promise.all([
    payload.find({
      collection: 'sessions',
      where: {
        and: [
          { subject: { equals: subjectId } },
          { date: { equals: date } },
          { _status: { equals: 'published' } },
        ],
      },
      depth: 2,
      limit: 1,
      overrideAccess: true,
    }),
    payload.find({
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
    }),
  ])

  const sessDoc = (sessionsRes.docs && sessionsRes.docs[0]) as any
  if (!sessDoc) {
    return null
  }

  // 3. Project session entries with strict zero-leak allowlist (ADR 0002)
  const rawEntries = (sessDoc.entries || []) as any[]
  const entries: PublicSessionEntry[] = rawEntries.map((e: any) => {
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
    }
  })

  // Sort entries alphabetically by student name
  entries.sort((a, b) => a.student.name.localeCompare(b.student.name, undefined, { sensitivity: 'base' }))

  // 4. Compute stats
  let presentCount = 0
  let absentCount = 0
  let excusedCount = 0
  let conflictCount = 0
  let notSetCount = 0
  let totalRecitations = 0

  for (const entry of entries) {
    if (entry.attendance === 'P') presentCount++
    else if (entry.attendance === 'A') absentCount++
    else if (entry.attendance === 'E') excusedCount++
    else if (entry.attendance === 'C') conflictCount++
    else notSetCount++

    totalRecitations += entry.recitations || 0
  }

  const totalStudents = entries.length
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 1000) / 10 : 0

  // 5. Project active roster for dispute student selector
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
    session: {
      id: sessDoc.id,
      date: sessDoc.date,
      kind: sessDoc.kind || 'class',
      noClassReason: sessDoc.noClassReason,
      entries,
    },
    roster,
    stats: {
      totalStudents,
      presentCount,
      absentCount,
      excusedCount,
      conflictCount,
      notSetCount,
      attendanceRate,
      totalRecitations,
    },
  }
}
