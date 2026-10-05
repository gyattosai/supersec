import { describe, expect, it } from 'vitest'
import { formatTimeRange12 } from '@/lib/format-time'

describe('Subjects List Page Helpers (S2)', () => {
  const sampleSubjects = [
    {
      id: 'subj-1',
      code: 'CS101',
      name: 'Algorithms and Complexity',
      sectionMark: 'A',
      professor: 'Dr. Turing',
      slug: 'cs101-algo',
      studentCount: 45,
      flaggedCount: 3,
      schedule: [{ weekday: 'mon', start: '13:00', end: '15:00' }],
    },
    {
      id: 'subj-2',
      code: 'MATH201',
      name: 'Linear Algebra',
      slug: 'math201-linalg',
      studentCount: 40,
      flaggedCount: 0,
      schedule: [{ weekday: 'wed', start: '08:30', end: '10:00' }],
    },
  ]

  it('formats schedule slots into 12-hour AM/PM format', () => {
    const slot1 = sampleSubjects[0].schedule[0]
    expect(formatTimeRange12(slot1.start, slot1.end)).toBe('1:00 PM – 3:00 PM')

    const slot2 = sampleSubjects[1].schedule[0]
    expect(formatTimeRange12(slot2.start, slot2.end)).toBe('8:30 AM – 10:00 AM')
  })
})
