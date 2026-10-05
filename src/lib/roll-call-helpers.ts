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

export interface FilterOptions {
  query?: string
  recitedOnly?: boolean
}

export function filterRosterEntries(entries: any[], options: FilterOptions = {}): any[] {
  let filtered = [...entries]

  if (options.recitedOnly) {
    filtered = filtered.filter((e) => (e.recitations || 0) > 0)
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
