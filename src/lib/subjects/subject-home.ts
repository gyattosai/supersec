import { getWeekdayAbbrev } from '@/lib/dashboard-helpers'

export interface SubjectScheduleSlot {
  weekday: string
  start: string
  end: string
}

export interface NextMeetingResult {
  date: string
  weekday: string
  start: string
  end: string
  isToday: boolean
}

export interface SubjectHomeHeaderData {
  subjectId: string
  code: string
  name: string
  sectionMark?: string
  professor?: string
  slug: string
  publicUrl: string
  nextMeetingBadge: string
  nextMeeting: NextMeetingResult | null
}

function formatDateISO(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0')
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return formatDateISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function computeNextMeeting(
  schedule: SubjectScheduleSlot[] | undefined | null,
  currentDateStr: string,
  currentTimeStr: string = '00:00',
): NextMeetingResult | null {
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return null
  }

  // Check today and up to next 7 days
  for (let offset = 0; offset <= 7; offset++) {
    const targetDate = addDaysToDate(currentDateStr, offset)
    const targetWeekday = getWeekdayAbbrev(targetDate)

    const matchingSlot = schedule.find(
      (slot) => slot.weekday.toLowerCase() === targetWeekday.toLowerCase(),
    )

    if (!matchingSlot) continue

    if (offset === 0) {
      // If today, check if meeting hasn't ended yet
      if (matchingSlot.end > currentTimeStr) {
        return {
          date: targetDate,
          weekday: matchingSlot.weekday.toLowerCase(),
          start: matchingSlot.start,
          end: matchingSlot.end,
          isToday: true,
        }
      }
    } else {
      return {
        date: targetDate,
        weekday: matchingSlot.weekday.toLowerCase(),
        start: matchingSlot.start,
        end: matchingSlot.end,
        isToday: false,
      }
    }
  }

  return null
}

export function projectSubjectHomeHeader(
  subject: {
    id: string
    code: string
    name: string
    sectionMark?: string
    professor?: string
    slug: string
    schedule?: SubjectScheduleSlot[]
  },
  currentDateStr: string,
  currentTimeStr: string = '00:00',
): SubjectHomeHeaderData {
  const nextMeeting = computeNextMeeting(subject.schedule, currentDateStr, currentTimeStr)

  let nextMeetingBadge = 'No upcoming class'
  if (nextMeeting) {
    const dayLabel = nextMeeting.isToday ? 'Today' : capitalize(nextMeeting.weekday)
    nextMeetingBadge = `${dayLabel} ${nextMeeting.start}–${nextMeeting.end}`
  }

  return {
    subjectId: subject.id,
    code: subject.code,
    name: subject.name,
    sectionMark: subject.sectionMark,
    professor: subject.professor,
    slug: subject.slug,
    publicUrl: `/s/${subject.slug}`,
    nextMeetingBadge,
    nextMeeting,
  }
}
