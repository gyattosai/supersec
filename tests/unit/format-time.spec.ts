import { describe, expect, it } from 'vitest'
import { formatTime12, formatTimeRange12 } from '@/lib/format-time'

describe('12-Hour Time Formatter (format-time)', () => {
  it('converts 24-hour time strings to 12-hour AM/PM format', () => {
    expect(formatTime12('08:00')).toBe('8:00 AM')
    expect(formatTime12('09:30')).toBe('9:30 AM')
    expect(formatTime12('12:00')).toBe('12:00 PM')
    expect(formatTime12('13:00')).toBe('1:00 PM')
    expect(formatTime12('15:00')).toBe('3:00 PM')
    expect(formatTime12('16:30')).toBe('4:30 PM')
    expect(formatTime12('18:00')).toBe('6:00 PM')
    expect(formatTime12('19:30')).toBe('7:30 PM')
    expect(formatTime12('23:59')).toBe('11:59 PM')
    expect(formatTime12('00:00')).toBe('12:00 AM')
  })

  it('formats time ranges in 12-hour format', () => {
    expect(formatTimeRange12('15:00', '16:30')).toBe('3:00 PM – 4:30 PM')
    expect(formatTimeRange12('18:00', '19:30')).toBe('6:00 PM – 7:30 PM')
    expect(formatTimeRange12('08:00', '10:00')).toBe('8:00 AM – 10:00 AM')
  })

  it('gracefully handles empty, invalid or already formatted strings', () => {
    expect(formatTime12('')).toBe('')
    expect(formatTime12(null)).toBe('')
    expect(formatTime12(undefined)).toBe('')
    expect(formatTime12('3:00 PM')).toBe('3:00 PM')
    expect(formatTimeRange12('', '')).toBe('')
  })
})
