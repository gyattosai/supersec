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

export interface SubjectSessionSummaryItem {
  id: string
  date: string
  kind: 'class' | 'noClass'
  title?: string
  status: string
  version: number
  presentCount: number
  absentCount: number
  totalEntries: number
  attendanceRate: number
  noClassReason?: string
}

export interface SubjectRosterItem {
  id: string
  studentId: string
  name: string
  studentNumber?: string
  sectionMark?: string
  hasScheduleConflict: boolean
  dropped: boolean
  enrolledOn?: string
}

export function projectSubjectSessionsList(rawSessions: any[]): SubjectSessionSummaryItem[] {
  if (!rawSessions || !Array.isArray(rawSessions)) return []

  const sorted = [...rawSessions].sort((a, b) => b.date.localeCompare(a.date))

  return sorted.map((s) => {
    const entries = Array.isArray(s.entries) ? s.entries : []
    let presentCount = 0
    let absentCount = 0

    for (const e of entries) {
      if (e.status === 'present' || e.status === 'excused' || e.status === 'conflict') {
        presentCount++
      } else if (e.status === 'absent') {
        absentCount++
      }
    }

    const totalEntries = entries.length
    const attendanceRate = totalEntries > 0 ? (presentCount / totalEntries) * 100 : 0

    return {
      id: s.id,
      date: s.date,
      kind: s.kind || 'class',
      title: s.title,
      status: s._status || 'published',
      version: s.version || 1,
      presentCount,
      absentCount,
      totalEntries,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      noClassReason: s.noClassReason,
    }
  })
}

export function projectSubjectRosterList(rawEnrollments: any[]): SubjectRosterItem[] {
  if (!rawEnrollments || !Array.isArray(rawEnrollments)) return []

  const items = rawEnrollments.map((enr) => {
    const student = typeof enr.student === 'object' && enr.student !== null ? enr.student : {}
    return {
      id: enr.id,
      studentId: student.id || enr.student,
      name: student.name || 'Unnamed Student',
      studentNumber: student.studentNumber,
      sectionMark: enr.sectionMark,
      hasScheduleConflict: Boolean(enr.hasScheduleConflict),
      dropped: Boolean(enr.dropped),
      enrolledOn: enr.enrolledOn,
    }
  })

  // Sort by Last Name / Name ascending
  return items.sort((a, b) => a.name.localeCompare(b.name))
}
