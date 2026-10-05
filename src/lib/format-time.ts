/**
 * Formats a 24-hour time string ("15:00", "08:30") to a clean 12-hour format ("3:00 PM", "8:30 AM").
 */
export function formatTime12(timeStr?: string | null): string {
  if (!timeStr) return ''
  const trimmed = timeStr.trim()
  if (!trimmed) return ''

  // Already contains AM or PM
  if (/AM|PM/i.test(trimmed)) {
    return trimmed
  }

  const parts = trimmed.split(':')
  if (parts.length < 2) return trimmed

  let hour = parseInt(parts[0], 10)
  const minute = parts[1].slice(0, 2)
  if (isNaN(hour)) return trimmed

  const period = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12
  if (hour === 0) hour = 12

  return `${hour}:${minute} ${period}`
}

/**
 * Formats a time range ("15:00", "16:30") to "3:00 PM – 4:30 PM".
 */
export function formatTimeRange12(start?: string | null, end?: string | null): string {
  if (!start && !end) return ''
  const formattedStart = formatTime12(start)
  const formattedEnd = formatTime12(end)

  if (formattedStart && formattedEnd) {
    return `${formattedStart} – ${formattedEnd}`
  }
  return formattedStart || formattedEnd
}
