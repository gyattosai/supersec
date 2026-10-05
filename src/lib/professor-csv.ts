export interface ProfessorCsvStudent {
  name: string
  studentNumber: string
  presentCount: number
  absentCount: number
  excusedCount: number
  conflictCount?: number
  attendancePercentage: number
  recitationsCount: number
  flag: 'none' | 'watch' | 'at_risk' | 'exceeded' | 'no_attendance'
  streak: number
}

export interface GenerateProfessorCsvArgs {
  subjectCode: string
  heldSessionsCount: number
  sessionDates?: string[]
  students: Array<
    ProfessorCsvStudent & {
      sessionMarks?: Record<string, string>
      presentStarCount?: number
      eligibleSessionsCount?: number
      attendanceRate?: number
    }
  >
}

export function escapeCsvField(val: string | number): string {
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function getFlagLabel(flag: ProfessorCsvStudent['flag']): string {
  switch (flag) {
    case 'none':
      return 'None'
    case 'watch':
      return 'Watch'
    case 'at_risk':
      return 'At Risk'
    case 'exceeded':
      return 'Exceeded Limit'
    case 'no_attendance':
      return 'No Attendance'
    default:
      return 'None'
  }
}

export function getFlagBadgeInfo(flag: ProfessorCsvStudent['flag']): {
  label: string
  variant: 'brand' | 'success' | 'warning' | 'danger' | 'neutral'
} {
  switch (flag) {
    case 'none':
      return { label: 'Good Standing', variant: 'success' }
    case 'watch':
      return { label: 'Watchlist', variant: 'warning' }
    case 'at_risk':
      return { label: 'At Risk', variant: 'warning' }
    case 'exceeded':
      return { label: 'Exceeded Limit', variant: 'danger' }
    case 'no_attendance':
      return { label: 'No Attendance', variant: 'neutral' }
    default:
      return { label: 'Good Standing', variant: 'neutral' }
  }
}

export function generateProfessorCsv({
  heldSessionsCount,
  sessionDates,
  students,
}: GenerateProfessorCsvArgs): string {
  if (sessionDates && sessionDates.length > 0) {
    const headers = [
      'Student Name',
      'Student Number',
      ...sessionDates,
      'Attended*',
      'Absences',
      'Excused',
      'Schedule Conflict',
      'Attendance %',
      'Recitations',
      'Absence Streak',
      'Status Flag',
    ]

    const rows = students.map((stu) => {
      const dateMarks = sessionDates.map((d) => stu.sessionMarks?.[d] || '—')
      const attendedStr = stu.presentStarCount !== undefined && stu.eligibleSessionsCount !== undefined
        ? `${stu.presentStarCount}/${stu.eligibleSessionsCount}`
        : `${stu.presentCount}/${heldSessionsCount}`
      const rateStr = stu.attendanceRate !== undefined
        ? `${stu.attendanceRate}%`
        : `${stu.attendancePercentage}%`

      return [
        `"${stu.name.replace(/"/g, '""')}"`,
        escapeCsvField(stu.studentNumber),
        ...dateMarks,
        attendedStr,
        stu.absentCount,
        stu.excusedCount,
        stu.conflictCount ?? 0,
        rateStr,
        stu.recitationsCount,
        stu.streak,
        escapeCsvField(getFlagLabel(stu.flag)),
      ].join(',')
    })

    return [headers.join(','), ...rows].join('\n')
  }

  const headers = [
    'Student Name',
    'Student Number',
    'Held Sessions',
    'Present',
    'Absent',
    'Excused',
    'Schedule Conflict',
    'Attendance %',
    'Recitations',
    'Absence Streak',
    'Status Flag',
  ]

  const rows = students.map((stu) => {
    return [
      `"${stu.name.replace(/"/g, '""')}"`,
      escapeCsvField(stu.studentNumber),
      heldSessionsCount,
      stu.presentCount,
      stu.absentCount,
      stu.excusedCount,
      stu.conflictCount ?? 0,
      `${stu.attendancePercentage}%`,
      stu.recitationsCount,
      stu.streak,
      escapeCsvField(getFlagLabel(stu.flag)),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
