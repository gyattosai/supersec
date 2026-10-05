import type { Payload } from 'payload'
import {
  generateSubjectSlug,
  validateMeetingSchedule,
  type MeetingSlot,
} from '@/collections/Subjects'

export const PUBLIC_SUBJECT_FIELDS = {
  id: true,
  name: true,
  code: true,
  slug: true,
  professor: true,
  schedule: true,
  sectionMark: true,
  sectionFull: true,
} as const

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

export interface VirtualSession {
  date: string
  weekday: string
  start: string
  end: string
}

export function computeUpcomingSessions(
  subject: { schedule: MeetingSlot[] },
  term: { startDate: string; endDate: string },
  fromDate?: string,
): VirtualSession[] {
  if (!subject.schedule || subject.schedule.length === 0) return []

  const startBound = fromDate && fromDate > term.startDate ? fromDate : term.startDate
  const endBound = term.endDate
  if (startBound > endBound) return []

  const scheduleByWeekday = new Map<number, MeetingSlot>()
  for (const slot of subject.schedule) {
    const dayNum = WEEKDAY_MAP[slot.weekday]
    if (dayNum !== undefined) {
      scheduleByWeekday.set(dayNum, slot)
    }
  }

  const sessions: VirtualSession[] = []

  // Iterate day by day in UTC to avoid daylight/local timezone shifts
  const [startY, startM, startD] = startBound.split('-').map(Number)
  const [endY, endM, endD] = endBound.split('-').map(Number)

  const current = new Date(Date.UTC(startY, startM - 1, startD))
  const end = new Date(Date.UTC(endY, endM - 1, endD))

  while (current <= end) {
    const dayOfWeek = current.getUTCDay()
    const match = scheduleByWeekday.get(dayOfWeek)

    if (match) {
      const y = current.getUTCFullYear()
      const m = String(current.getUTCMonth() + 1).padStart(2, '0')
      const d = String(current.getUTCDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`

      sessions.push({
        date: dateStr,
        weekday: match.weekday,
        start: match.start,
        end: match.end,
      })
    }

    current.setUTCDate(current.getUTCDate() + 1)
  }

  return sessions
}

export async function getPublicSubject(payload: Payload, slug: string) {
  const result = await payload.find({
    collection: 'subjects',
    where: {
      and: [
        {
          slug: {
            equals: slug.trim().toLowerCase(),
          },
        },
        {
          archivedAt: {
            exists: false,
          },
        },
      ],
    },
    // Compile-time zero-leak projection allowlist (ADR 0002, ADR 0005)
    select: PUBLIC_SUBJECT_FIELDS as any,
    overrideAccess: true,
    limit: 1,
  })

  if (!result.docs || result.docs.length === 0) {
    return null
  }

  return result.docs[0]
}

export async function createSubject(
  payload: Payload,
  data: {
    term: string
    name: string
    code: string
    schedule: MeetingSlot[]
    professor?: string
    sectionMark?: string
    sectionFull?: string
    room?: string
    zoomUrl?: string
    absenceLimit?: number
  },
) {
  const scheduleValidation = validateMeetingSchedule(data.schedule)
  if (!scheduleValidation.isValid) {
    throw new Error(scheduleValidation.error || 'Invalid schedule')
  }

  const slug = generateSubjectSlug(data.code)

  const result = await payload.create({
    collection: 'subjects',
    data: {
      ...data,
      slug,
    },
    overrideAccess: true,
  })

  return result
}
