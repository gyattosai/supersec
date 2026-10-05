export interface PublishCheckResult {
  canPublish: boolean
  unsetCount: number
  unsetStudentNames: string[]
}

export function countUnsetStudents(entries: any[]): number {
  return entries.filter((e) => e.attendance == null).length
}

export function canPublishSession(entries: any[]): PublishCheckResult {
  const unsetEntries = entries.filter((e) => e.attendance == null)
  const unsetStudentNames = unsetEntries.map((e) => {
    if (typeof e.student === 'object' && e.student !== null) {
      return e.student.name || 'Unnamed student'
    }
    return 'Unnamed student'
  })

  return {
    canPublish: unsetEntries.length === 0,
    unsetCount: unsetEntries.length,
    unsetStudentNames,
  }
}

export interface SessionLiveScore {
  total: number
  present: number
  absent: number
  excused: number
  conflict: number
  unset: number
  attendancePercentage: number
}

/**
 * Computes live presence totals and attendance percentage for active session scoreboard.
 * Excused (E) and Conflict (C) are excluded from the attendance rate denominator per R2.
 */
export function calculateSessionLiveScore(entries: any[]): SessionLiveScore {
  const total = entries.length
  let present = 0
  let absent = 0
  let excused = 0
  let conflict = 0
  let unset = 0

  for (const e of entries) {
    if (e.attendance === 'P') present++
    else if (e.attendance === 'A') absent++
    else if (e.attendance === 'E') excused++
    else if (e.attendance === 'C') conflict++
    else unset++
  }

  const evaluated = present + absent
  const attendancePercentage = evaluated > 0 ? Math.round((present / evaluated) * 100) : 100

  return {
    total,
    present,
    absent,
    excused,
    conflict,
    unset,
    attendancePercentage,
  }
}

export type StatusFilterOption = 'all' | 'unset' | 'present' | 'absent' | 'excused' | 'conflict'

export interface FilterOptions {
  query?: string
  recitedOnly?: boolean
  statusFilter?: StatusFilterOption
}

export function filterRosterEntries(entries: any[], options: FilterOptions = {}): any[] {
  let filtered = [...entries]

  if (options.recitedOnly) {
    filtered = filtered.filter((e) => (e.recitations || 0) > 0)
  }

  if (options.statusFilter && options.statusFilter !== 'all') {
    if (options.statusFilter === 'unset') {
      filtered = filtered.filter((e) => e.attendance == null)
    } else if (options.statusFilter === 'present') {
      filtered = filtered.filter((e) => e.attendance === 'P')
    } else if (options.statusFilter === 'absent') {
      filtered = filtered.filter((e) => e.attendance === 'A')
    } else if (options.statusFilter === 'excused') {
      filtered = filtered.filter((e) => e.attendance === 'E')
    } else if (options.statusFilter === 'conflict') {
      filtered = filtered.filter((e) => e.attendance === 'C')
    }
  }

  if (options.query && options.query.trim().length > 0) {
    const q = options.query.trim().toLowerCase()
    filtered = filtered.filter((e) => {
      const student = typeof e.student === 'object' && e.student !== null ? e.student : {}
      const name = (student.name || '').toLowerCase()
      const studentNumber = (student.studentNumber || '').toLowerCase()
      return name.includes(q) || studentNumber.includes(q)
    })
  }

  return filtered
}
