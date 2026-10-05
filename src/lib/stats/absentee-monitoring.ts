export interface MonitoringEnrollment {
  id: string
  studentId: string
  name: string
  studentNumber?: string
  sectionMark?: string
  hasScheduleConflict?: boolean
  enrolledOn?: string // YYYY-MM-DD
  dropped?: boolean
  droppedOn?: string // YYYY-MM-DD
  displayOrder?: number
}

export interface MonitoringSessionEntry {
  studentId: string
  attendance?: 'P' | 'A' | 'E' | 'C' | null
  recitations?: number
}

export interface MonitoringSession {
  id: string
  date: string // YYYY-MM-DD
  kind: 'class' | 'noClass'
  entries: MonitoringSessionEntry[]
}

export interface MonitoringOptions {
  enrollments: MonitoringEnrollment[]
  sessions: MonitoringSession[]
  absenceLimit?: number
  streakThreshold?: number
  subjectId?: string
}

export type AbsenteeCategory =
  | 'no_attendance'
  | 'below_50'
  | 'exceeded'
  | 'at_risk'
  | 'watch'
  | 'streak'
  | 'normal'

export interface StudentMonitoringResult {
  enrollmentId: string
  studentId: string
  name: string
  studentNumber?: string
  sectionMark?: string
  hasScheduleConflict: boolean
  dropped: boolean

  // Counts
  eligibleSessionsCount: number // Denominator (held class sessions while enrolled)
  presentCount: number // P
  excusedCount: number // E
  conflictCount: number // C
  absentCount: number // A (unexcused)
  presentStarCount: number // P + E + C
  recitationsCount: number

  // Rate & streak
  attendanceRate: number // (presentStarCount / eligibleSessionsCount) * 100
  consecutiveAbsences: number // streak of A, skipping E & C (Rule R2)

  // Flags & categories
  categories: AbsenteeCategory[]
  primaryCategory: AbsenteeCategory
  isNoAttendance: boolean
  isBelow50: boolean
  isWatch: boolean
  isAtRisk: boolean
  isExceeded: boolean
  hasStreak: boolean

  // Session marks chronological map: { [sessionDate]: 'P' | 'A' | 'E' | 'C' | '—' }
  sessionMarks: Record<string, 'P' | 'A' | 'E' | 'C' | '—'>
}

export interface SubjectMonitoringSummary {
  subjectId?: string
  absenceLimit: number
  streakThreshold: number
  totalHeldClassSessions: number
  totalNoClassSessions: number
  totalStudents: number
  activeStudents: number
  droppedStudents: number

  // Aggregate category counts
  noAttendanceCount: number
  below50Count: number
  watchCount: number
  atRiskCount: number
  exceededCount: number
  streakCount: number
  totalFlaggedCount: number

  students: StudentMonitoringResult[]
  flaggedStudents: StudentMonitoringResult[]
}

export function computeStudentMonitoring(
  enrollment: MonitoringEnrollment,
  sessions: MonitoringSession[],
  absenceLimit: number = 4,
  streakThreshold: number = 3,
): StudentMonitoringResult {
  // 1. Filter out No Class days and sort sessions chronologically ascending
  const classSessions = sessions
    .filter((s) => s.kind === 'class')
    .sort((a, b) => a.date.localeCompare(b.date))

  let eligibleSessionsCount = 0
  let presentCount = 0
  let excusedCount = 0
  let conflictCount = 0
  let absentCount = 0
  let recitationsCount = 0
  const attendanceHistory: Array<'P' | 'A' | 'E' | 'C'> = []
  const sessionMarks: Record<string, 'P' | 'A' | 'E' | 'C' | '—'> = {}

  for (const session of classSessions) {
    // Check if session occurred before enrollment date
    if (enrollment.enrolledOn && session.date < enrollment.enrolledOn) {
      sessionMarks[session.date] = '—'
      continue
    }

    // Check if session occurred after student was dropped
    if (enrollment.dropped && enrollment.droppedOn && session.date > enrollment.droppedOn) {
      sessionMarks[session.date] = '—'
      continue
    }

    eligibleSessionsCount++

    const entry = session.entries.find((e) => e.studentId === enrollment.studentId)
    const mark = entry?.attendance || 'A'

    if (mark === 'P') {
      presentCount++
      attendanceHistory.push('P')
      sessionMarks[session.date] = 'P'
    } else if (mark === 'E') {
      excusedCount++
      attendanceHistory.push('E')
      sessionMarks[session.date] = 'E'
    } else if (mark === 'C') {
      conflictCount++
      attendanceHistory.push('C')
      sessionMarks[session.date] = 'C'
    } else {
      absentCount++
      attendanceHistory.push('A')
      sessionMarks[session.date] = 'A'
    }

    recitationsCount += entry?.recitations || 0
  }

  // Present* = P + E + C
  const presentStarCount = presentCount + excusedCount + conflictCount

  // Attendance % calculation
  const attendanceRate =
    eligibleSessionsCount === 0
      ? 100
      : Math.round((presentStarCount / eligibleSessionsCount) * 1000) / 10

  // Rule R2: Streak calculation (Excused E & Conflict C neither break nor extend streaks)
  let consecutiveAbsences = 0
  for (let i = attendanceHistory.length - 1; i >= 0; i--) {
    const mark = attendanceHistory[i]
    if (mark === 'E' || mark === 'C') {
      // Neither breaks nor extends: skip without breaking
      continue
    }
    if (mark === 'A') {
      consecutiveAbsences++
    } else {
      // 'P' breaks the streak
      break
    }
  }

  // Threshold flags
  const isNoAttendance = presentStarCount === 0 && eligibleSessionsCount > 0
  const isBelow50 = attendanceRate < 50 && eligibleSessionsCount > 0
  const isExceeded = absentCount >= absenceLimit
  const isAtRisk = absentCount >= absenceLimit * 0.75 && absentCount < absenceLimit
  const isWatch = absentCount >= absenceLimit * 0.5 && absentCount < absenceLimit * 0.75
  const hasStreak = consecutiveAbsences >= streakThreshold

  const categories: AbsenteeCategory[] = []
  if (isNoAttendance) categories.push('no_attendance')
  if (isBelow50 && !isNoAttendance) categories.push('below_50')
  if (isExceeded) categories.push('exceeded')
  if (isAtRisk) categories.push('at_risk')
  if (isWatch) categories.push('watch')
  if (hasStreak) categories.push('streak')
  if (categories.length === 0) categories.push('normal')

  // Primary category determination (highest priority flag)
  let primaryCategory: AbsenteeCategory = 'normal'
  if (isNoAttendance) primaryCategory = 'no_attendance'
  else if (isExceeded) primaryCategory = 'exceeded'
  else if (isAtRisk) primaryCategory = 'at_risk'
  else if (isBelow50) primaryCategory = 'below_50'
  else if (isWatch) primaryCategory = 'watch'
  else if (hasStreak) primaryCategory = 'streak'

  return {
    enrollmentId: enrollment.id,
    studentId: enrollment.studentId,
    name: enrollment.name,
    studentNumber: enrollment.studentNumber,
    sectionMark: enrollment.sectionMark,
    hasScheduleConflict: Boolean(enrollment.hasScheduleConflict),
    dropped: Boolean(enrollment.dropped),
    eligibleSessionsCount,
    presentCount,
    excusedCount,
    conflictCount,
    absentCount,
    presentStarCount,
    recitationsCount,
    attendanceRate,
    consecutiveAbsences,
    categories,
    primaryCategory,
    isNoAttendance,
    isBelow50,
    isWatch,
    isAtRisk,
    isExceeded,
    hasStreak,
    sessionMarks,
  }
}

export function computeAbsenteeMonitoring(options: MonitoringOptions): SubjectMonitoringSummary {
  const absenceLimit = options.absenceLimit ?? 4
  const streakThreshold = options.streakThreshold ?? 3

  const totalHeldClassSessions = options.sessions.filter((s) => s.kind === 'class').length
  const totalNoClassSessions = options.sessions.filter((s) => s.kind === 'noClass').length

  const students = options.enrollments.map((enr) =>
    computeStudentMonitoring(enr, options.sessions, absenceLimit, streakThreshold),
  )

  // Sort by Last Name / Name ascending
  students.sort((a, b) => a.name.localeCompare(b.name))

  let noAttendanceCount = 0
  let below50Count = 0
  let watchCount = 0
  let atRiskCount = 0
  let exceededCount = 0
  let streakCount = 0

  for (const s of students) {
    if (s.isNoAttendance) noAttendanceCount++
    if (s.isBelow50) below50Count++
    if (s.isWatch) watchCount++
    if (s.isAtRisk) atRiskCount++
    if (s.isExceeded) exceededCount++
    if (s.hasStreak) streakCount++
  }

  const flaggedStudents = students
    .filter(
      (s) =>
        s.isNoAttendance ||
        s.isBelow50 ||
        s.isExceeded ||
        s.isAtRisk ||
        s.isWatch ||
        s.hasStreak,
    )
    .sort((a, b) => a.attendanceRate - b.attendanceRate || b.absentCount - a.absentCount)

  const activeStudents = options.enrollments.filter((e) => !e.dropped).length
  const droppedStudents = options.enrollments.filter((e) => e.dropped).length

  return {
    subjectId: options.subjectId,
    absenceLimit,
    streakThreshold,
    totalHeldClassSessions,
    totalNoClassSessions,
    totalStudents: options.enrollments.length,
    activeStudents,
    droppedStudents,
    noAttendanceCount,
    below50Count,
    watchCount,
    atRiskCount,
    exceededCount,
    streakCount,
    totalFlaggedCount: flaggedStudents.length,
    students,
    flaggedStudents,
  }
}
