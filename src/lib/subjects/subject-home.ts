import { getWeekdayAbbrev } from '@/lib/dashboard-helpers'
import { formatTimeRange12 } from '@/lib/format-time'
import { isAnnouncementPinned } from '@/lib/posts/lifecycle'
import { formatStudentDisplayName } from '@/lib/data/students'

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
    nextMeetingBadge = `${dayLabel} ${formatTimeRange12(nextMeeting.start, nextMeeting.end)}`
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
      name: formatStudentDisplayName(student),
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

export interface SubjectRequestItem {
  id: string
  subjectId?: string
  subjectCode?: string
  subjectName?: string
  sessionId: string
  sessionDate?: string
  studentId: string
  studentName: string
  studentNumber?: string
  type: 'present' | 'excuse' | 'recited'
  reason?: string
  count?: number
  topic?: string
  proofUrl?: string
  status: 'pending' | 'approved' | 'declined' | 'expired'
  createdAt: string
  decidedAt?: string
  decisionNote?: string
}

export function projectSubjectRequestsList(rawRequests: any[]): SubjectRequestItem[] {
  if (!rawRequests || !Array.isArray(rawRequests)) return []

  const sorted = [...rawRequests].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime()
    const timeB = new Date(b.createdAt || 0).getTime()
    return timeB - timeA
  })

  return sorted.map((req) => {
    const student = typeof req.student === 'object' && req.student !== null ? req.student : {}
    const session = typeof req.session === 'object' && req.session !== null ? req.session : {}
    const subject = typeof req.subject === 'object' && req.subject !== null ? req.subject : {}

    return {
      id: req.id,
      subjectId: subject.id || req.subject,
      subjectCode: subject.code,
      subjectName: subject.name,
      sessionId: session.id || req.session,
      sessionDate: session.date,
      studentId: student.id || req.student,
      studentName: student.name || 'Unknown Student',
      studentNumber: student.studentNumber,
      type: req.type || 'present',
      reason: req.reason,
      count: req.count,
      topic: req.topic,
      proofUrl: req.proofUrl,
      status: req.status || 'pending',
      createdAt: req.createdAt,
      decidedAt: req.decidedAt,
      decisionNote: req.decisionNote,
    }
  })
}

export interface SubjectAnnouncementItem {
  id: string
  title: string
  slug: string
  body?: any
  image?: string
  priority: boolean
  isPinned: boolean
  pinnedUntil?: string
  status: 'draft' | 'published' | 'archived'
  publishedAt?: string
  changeNote?: string
  createdAt?: string
}

export function projectSubjectAnnouncementsList(
  rawAnnouncements: any[],
  todayDate: string,
): SubjectAnnouncementItem[] {
  if (!rawAnnouncements || !Array.isArray(rawAnnouncements)) return []

  const mapped: SubjectAnnouncementItem[] = rawAnnouncements.map((doc) => {
    let status: 'draft' | 'published' | 'archived' = 'draft'
    if (doc.archivedAt) {
      status = 'archived'
    } else if (doc._status === 'published' || doc.publishedAt) {
      status = 'published'
    }

    const priority = Boolean(doc.priority)
    const isPinned = priority && isAnnouncementPinned(doc.pinnedUntil, todayDate)

    return {
      id: doc.id,
      title: doc.title || 'Untitled Announcement',
      slug: doc.slug,
      body: doc.body,
      image: doc.image,
      priority,
      isPinned,
      pinnedUntil: doc.pinnedUntil,
      status,
      publishedAt: doc.publishedAt,
      changeNote: doc.changeNote,
      createdAt: doc.createdAt,
    }
  })

  // Sort: active pinned first, then by publishedAt / createdAt descending
  return mapped.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1

    const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime()
    const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime()
    return timeB - timeA
  })
}

export interface SubjectResourceItem {
  id: string
  title: string
  slug: string
  url?: string
  category?: string
  attachments?: Array<{
    name: string
    fileUrl: string
    size?: string
  }>
  body?: any
  status: 'draft' | 'published' | 'archived'
  publishedAt?: string
  changeNote?: string
  createdAt?: string
}

export function projectSubjectResourcesList(
  rawResources: any[],
  categoryFilter?: string,
): SubjectResourceItem[] {
  if (!rawResources || !Array.isArray(rawResources)) return []

  const filtered = categoryFilter
    ? rawResources.filter(
        (r) => (r.category || '').toLowerCase() === categoryFilter.toLowerCase(),
      )
    : rawResources

  const mapped: SubjectResourceItem[] = filtered.map((doc) => {
    let status: 'draft' | 'published' | 'archived' = 'draft'
    if (doc.archivedAt) {
      status = 'archived'
    } else if (doc._status === 'published' || doc.publishedAt) {
      status = 'published'
    }

    return {
      id: doc.id,
      title: doc.title || 'Untitled Resource',
      slug: doc.slug,
      url: doc.url,
      category: doc.category,
      attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
      body: doc.body,
      status,
      publishedAt: doc.publishedAt,
      changeNote: doc.changeNote,
      createdAt: doc.createdAt,
    }
  })

  // Sort by publishedAt / createdAt descending
  return mapped.sort((a, b) => {
    const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime()
    const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime()
    return timeB - timeA
  })
}

export interface SubjectQuestionItem {
  id: string
  question: string
  slug: string
  answer?: any
  tags?: string[]
  official: boolean
  status: 'draft' | 'published' | 'archived'
  publishedAt?: string
  changeNote?: string
  createdAt?: string
}

export function projectSubjectQuestionsList(
  rawQuestions: any[],
  tagFilter?: string,
  officialOnly?: boolean,
): SubjectQuestionItem[] {
  if (!rawQuestions || !Array.isArray(rawQuestions)) return []

  let filtered = rawQuestions
  if (officialOnly) {
    filtered = filtered.filter((q) => Boolean(q.official))
  }
  if (tagFilter) {
    const target = tagFilter.toLowerCase()
    filtered = filtered.filter((q) =>
      Array.isArray(q.tags) && q.tags.some((t: string) => (t || '').toLowerCase() === target),
    )
  }

  const mapped: SubjectQuestionItem[] = filtered.map((doc) => {
    let status: 'draft' | 'published' | 'archived' = 'draft'
    if (doc.archivedAt) {
      status = 'archived'
    } else if (doc._status === 'published' || doc.publishedAt) {
      status = 'published'
    }

    return {
      id: doc.id,
      question: doc.question || 'Untitled Question',
      slug: doc.slug,
      answer: doc.answer,
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      official: Boolean(doc.official),
      status,
      publishedAt: doc.publishedAt,
      changeNote: doc.changeNote,
      createdAt: doc.createdAt,
    }
  })

  // Sort by publishedAt / createdAt descending
  return mapped.sort((a, b) => {
    const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime()
    const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime()
    return timeB - timeA
  })
}

