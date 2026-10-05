import type { Payload } from 'payload'
import { DATE_REGEX } from '@/collections/Terms'
import { validatePublishableSession } from '@/collections/Sessions'

export interface SessionEntry {
  student: string
  attendance?: 'P' | 'A' | 'E' | null
  recitations?: number
  recitationTopic?: string
}

export async function checkSessionConflict(
  payload: Payload,
  subjectId: string,
  date: string,
): Promise<void> {
  const existing = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        {
          subject: {
            equals: subjectId,
          },
        },
        {
          date: {
            equals: date,
          },
        },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs && existing.docs.length > 0) {
    throw new Error(`A session already exists for this subject on ${date}`)
  }
}

export async function startSession(
  payload: Payload,
  data: {
    subjectId: string
    date: string
  },
) {
  if (!data.date || !DATE_REGEX.test(data.date)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }

  // Enforce compound uniqueness (Rules R7, R8)
  await checkSessionConflict(payload, data.subjectId, data.date)

  // Query enrollments for this subject
  const enrollmentsRes = await payload.find({
    collection: 'enrollments',
    where: {
      subject: {
        equals: data.subjectId,
      },
    },
    limit: 500,
    overrideAccess: true,
  })

  // Filter enrollments active on this session date
  const activeEntries: SessionEntry[] = (enrollmentsRes.docs || [])
    .filter((enr: any) => {
      if (enr.enrolledOn && enr.enrolledOn > data.date) return false
      if (enr.status === 'dropped') {
        return Boolean(enr.droppedOn && enr.droppedOn >= data.date)
      }
      return enr.status === 'active'
    })
    .map((enr: any) => ({
      student: typeof enr.student === 'object' ? enr.student.id : enr.student,
      attendance: null,
      recitations: 0,
    }))

  const session = await payload.create({
    collection: 'sessions',
    data: {
      subject: data.subjectId,
      date: data.date,
      kind: 'class',
      phase: 'live',
      entries: activeEntries,
    },
    overrideAccess: true,
  })

  return session
}

export async function markNoClass(
  payload: Payload,
  data: {
    subjectId: string
    date: string
    reason: string
  },
) {
  if (!data.date || !DATE_REGEX.test(data.date)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }

  const cleanReason = (data.reason || '').trim()
  if (!cleanReason) {
    throw new Error('A reason is required when marking No Class')
  }

  await checkSessionConflict(payload, data.subjectId, data.date)

  const session = await payload.create({
    collection: 'sessions',
    data: {
      subject: data.subjectId,
      date: data.date,
      kind: 'noClass',
      phase: 'finished',
      noClassReason: cleanReason,
      _status: 'published',
    },
    overrideAccess: true,
  })

  return session
}

export async function recordAttendance(
  payload: Payload,
  sessionId: string,
  studentId: string,
  attendance: 'P' | 'A' | 'E' | null,
) {
  if (attendance !== null && !['P', 'A', 'E'].includes(attendance)) {
    throw new Error(`Invalid attendance status: ${attendance}`)
  }

  const session = await payload.findByID({
    collection: 'sessions',
    id: sessionId,
    overrideAccess: true,
  })

  if (!session || !session.entries) {
    throw new Error(`Session ${sessionId} not found`)
  }

  const entries: SessionEntry[] = session.entries.map((e: any) => {
    const entryStudentId = typeof e.student === 'object' ? e.student.id : e.student
    if (entryStudentId === studentId) {
      return {
        ...e,
        student: entryStudentId,
        attendance,
      }
    }
    return {
      ...e,
      student: entryStudentId,
    }
  })

  const updated = await payload.update({
    collection: 'sessions',
    id: sessionId,
    data: {
      entries,
    },
    overrideAccess: true,
  })

  return updated
}

export async function adjustRecitation(
  payload: Payload,
  sessionId: string,
  studentId: string,
  delta: number,
  topic?: string,
) {
  const session = await payload.findByID({
    collection: 'sessions',
    id: sessionId,
    overrideAccess: true,
  })

  if (!session || !session.entries) {
    throw new Error(`Session ${sessionId} not found`)
  }

  const entries: SessionEntry[] = session.entries.map((e: any) => {
    const entryStudentId = typeof e.student === 'object' ? e.student.id : e.student
    if (entryStudentId === studentId) {
      const current = e.recitations || 0
      const nextCount = Math.max(0, current + delta)
      return {
        ...e,
        student: entryStudentId,
        recitations: nextCount,
        recitationTopic: topic !== undefined ? topic : e.recitationTopic,
      }
    }
    return {
      ...e,
      student: entryStudentId,
    }
  })

  const updated = await payload.update({
    collection: 'sessions',
    id: sessionId,
    data: {
      entries,
    },
    overrideAccess: true,
  })

  return updated
}

export async function markAllPresent(
  payload: Payload,
  sessionId: string,
): Promise<{ updatedCount: number; session: any }> {
  const session = await payload.findByID({
    collection: 'sessions',
    id: sessionId,
    overrideAccess: true,
  })

  if (!session || !session.entries) {
    throw new Error(`Session ${sessionId} not found`)
  }

  let updatedCount = 0

  // Rule R1: "Mark all Present" fills only "Not set" rows, never touching P, A, or E
  const entries: SessionEntry[] = session.entries.map((e: any) => {
    const entryStudentId = typeof e.student === 'object' ? e.student.id : e.student
    if (!e.attendance) {
      updatedCount++
      return {
        ...e,
        student: entryStudentId,
        attendance: 'P',
      }
    }
    return {
      ...e,
      student: entryStudentId,
    }
  })

  const updated = await payload.update({
    collection: 'sessions',
    id: sessionId,
    data: {
      entries,
    },
    overrideAccess: true,
  })

  return { updatedCount, session: updated }
}

export async function publishSession(
  payload: Payload,
  sessionId: string,
  changeNote: string,
) {
  const session = await payload.findByID({
    collection: 'sessions',
    id: sessionId,
    overrideAccess: true,
  })

  if (!session) {
    throw new Error(`Session ${sessionId} not found`)
  }

  const validation = validatePublishableSession({
    ...session,
    _status: 'published',
    changeNote,
  })

  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  const updated = await payload.update({
    collection: 'sessions',
    id: sessionId,
    data: {
      changeNote: changeNote.trim(),
      phase: 'finished',
      _status: 'published',
    },
    overrideAccess: true,
  })

  return updated
}


