export interface ScheduledClass {
  subject: any
  slot: {
    weekday: string
    start: string
    end: string
  }
}

const WEEKDAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

export function getWeekdayAbbrev(dateStr: string): 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' {
  // Parse YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return WEEKDAY_NAMES[dt.getUTCDay()]
}

export function getTodayClasses(subjects: any[], weekday: string): ScheduledClass[] {
  const result: ScheduledClass[] = []

  for (const subj of subjects) {
    if (!Array.isArray(subj.schedule)) continue
    for (const slot of subj.schedule) {
      if (slot.weekday === weekday) {
        result.push({
          subject: subj,
          slot,
        })
      }
    }
  }

  // Sort by class start time ascending
  return result.sort((a, b) => a.slot.start.localeCompare(b.slot.start))
}

export function matchExistingSession(
  sessions: any[],
  subjectId: string,
  date: string,
): any | null {
  for (const sess of sessions) {
    if (sess.date !== date) continue
    const sId = typeof sess.subject === 'object' && sess.subject !== null ? sess.subject.id : sess.subject
    if (sId === subjectId) {
      return sess
    }
  }
  return null
}

import { computeAbsenteeMonitoring } from './stats/absentee-monitoring'

export interface DashboardMetricsResult {
  totalFlaggedCount: number
  subjectFlaggedCounts: Record<string, number>
}

export function computeDashboardMetrics(params: {
  subjects: any[]
  enrollments: any[]
  sessions: any[]
}): DashboardMetricsResult {
  const { subjects, enrollments, sessions } = params
  const subjectFlaggedCounts: Record<string, number> = {}
  let totalFlaggedCount = 0

  const enrollmentsBySubject = new Map<string, any[]>()
  for (const enr of enrollments) {
    const sId = typeof enr.subject === 'object' && enr.subject !== null ? enr.subject.id : enr.subject
    if (!sId) continue
    const list = enrollmentsBySubject.get(sId) || []
    list.push(enr)
    enrollmentsBySubject.set(sId, list)
  }

  const sessionsBySubject = new Map<string, any[]>()
  for (const sess of sessions) {
    const sId = typeof sess.subject === 'object' && sess.subject !== null ? sess.subject.id : sess.subject
    if (!sId) continue
    const list = sessionsBySubject.get(sId) || []
    list.push(sess)
    sessionsBySubject.set(sId, list)
  }

  for (const subj of subjects) {
    const subjEnrollments = (enrollmentsBySubject.get(subj.id) || []).map((enr: any) => {
      const student = typeof enr.student === 'object' && enr.student !== null ? enr.student : {}
      return {
        id: enr.id,
        studentId: student.id || enr.student,
        name: student.name || 'Student',
        studentNumber: student.studentNumber,
        sectionMark: enr.sectionMark,
        hasScheduleConflict: Boolean(enr.hasScheduleConflict),
        enrolledOn: enr.enrolledOn,
        dropped: enr.status === 'dropped' || Boolean(enr.dropped),
        droppedOn: enr.droppedOn,
        displayOrder: enr.displayOrder,
      }
    })

    const subjSessions = (sessionsBySubject.get(subj.id) || []).map((s: any) => ({
      id: s.id,
      date: s.date,
      kind: (s.kind || 'class') as 'class' | 'noClass',
      entries: (s.entries || []).map((e: any) => ({
        studentId: typeof e.student === 'object' && e.student !== null ? e.student.id : e.student,
        attendance: e.attendance,
        recitations: e.recitations,
      })),
    }))

    const monitoring = computeAbsenteeMonitoring({
      enrollments: subjEnrollments,
      sessions: subjSessions,
      absenceLimit: subj.absenceLimit ?? 4,
      subjectId: subj.id,
    })

    subjectFlaggedCounts[subj.id] = monitoring.totalFlaggedCount
    totalFlaggedCount += monitoring.totalFlaggedCount
  }

  return {
    totalFlaggedCount,
    subjectFlaggedCounts,
  }
}
