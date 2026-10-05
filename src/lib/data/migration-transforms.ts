// Helper to convert UTC timestamp to Asia/Manila date YYYY-MM-DD
export function utcToManilaDateString(utcTimestamp: string): string {
  const d = new Date(utcTimestamp)
  // Asia/Manila is UTC+8
  const manilaMs = d.getTime() + 8 * 60 * 60 * 1000
  const manilaDate = new Date(manilaMs)
  const yyyy = manilaDate.getUTCFullYear()
  const mm = String(manilaDate.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(manilaDate.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Helper to map weekday number (0=Sun, 1=Mon, ..., 6=Sat) to v2 string
export function mapWeekdayNumberToString(dayNum: number): 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' {
  switch (dayNum) {
    case 1:
      return 'mon'
    case 2:
      return 'tue'
    case 3:
      return 'wed'
    case 4:
      return 'thu'
    case 5:
      return 'fri'
    case 6:
      return 'sat'
    case 0:
    default:
      return 'sun'
  }
}

// Helper to map v1 attendanceStatus to v2 PresenceState ('P' | 'A' | 'E' | 'C' | null)
export function mapV1AttendanceStatus(
  status: string | null | undefined,
  hasScheduleConflict: boolean = false,
): 'P' | 'A' | 'E' | 'C' | null {
  if (!status) {
    return hasScheduleConflict ? 'C' : null
  }
  const upper = status.trim().toUpperCase()
  if (upper === 'PRESENT' || upper === 'P') return 'P'
  if (upper === 'ABSENT' || upper === 'A') return 'A'
  if (upper === 'EXCUSED' || upper === 'E') return 'E'
  if (upper === 'CONFLICT' || upper === 'C' || upper === 'WITH_SCHEDULE_CONFLICT') return 'C'
  if (upper === 'NOT_SET' || upper === 'UNMARKED' || upper === '-') {
    return hasScheduleConflict ? 'C' : null
  }
  return hasScheduleConflict ? 'C' : null
}
