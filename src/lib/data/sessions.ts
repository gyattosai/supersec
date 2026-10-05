import type { Payload } from 'payload'
import { DATE_REGEX } from '@/collections/Terms'

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
