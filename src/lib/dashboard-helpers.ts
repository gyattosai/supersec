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
