import { describe, expect, it } from 'vitest'
import {
  getTodayClasses,
  matchExistingSession,
  getWeekdayAbbrev,
} from '@/lib/dashboard-helpers'

describe('Dashboard Helpers & Session Matching (Ticket 05)', () => {
  const sampleSubjects = [
    {
      id: 'subj-1',
      code: 'CS101',
      name: 'Algorithms',
      schedule: [
        { weekday: 'mon', start: '08:00', end: '10:00' },
        { weekday: 'wed', start: '08:00', end: '10:00' },
      ],
      room: 'Room 302',
    },
    {
      id: 'subj-2',
      code: 'MATH201',
      name: 'Linear Algebra',
      schedule: [
        { weekday: 'mon', start: '13:00', end: '15:00' },
        { weekday: 'fri', start: '13:00', end: '15:00' },
      ],
      room: 'Math Hall 1',
    },
    {
      id: 'subj-3',
      code: 'PHYS101',
      name: 'Mechanics',
      schedule: [{ weekday: 'tue', start: '10:00', end: '12:00' }],
    },
  ]

  describe('getTodayClasses', () => {
    it('filters and sorts subjects scheduled for today by start time', () => {
      // Monday
      const todayClasses = getTodayClasses(sampleSubjects as any, 'mon')
      expect(todayClasses).toHaveLength(2)
      // CS101 at 08:00 comes before MATH201 at 13:00
      expect(todayClasses[0].subject.code).toBe('CS101')
      expect(todayClasses[0].slot.start).toBe('08:00')
      expect(todayClasses[1].subject.code).toBe('MATH201')
      expect(todayClasses[1].slot.start).toBe('13:00')
    })

    it('returns empty array when no classes are scheduled for the day', () => {
      const sundayClasses = getTodayClasses(sampleSubjects as any, 'sun')
      expect(sundayClasses).toHaveLength(0)
    })
  })

  describe('matchExistingSession', () => {
    const existingSessions = [
      {
        id: 'sess-1',
        subject: 'subj-1',
        date: '2026-10-05',
        _status: 'draft',
        type: 'regular',
      },
      {
        id: 'sess-2',
        subject: { id: 'subj-2' },
        date: '2026-10-05',
        _status: 'published',
        type: 'no-class',
      },
    ]

    it('matches session by subject string ID and date', () => {
      const match = matchExistingSession(existingSessions as any, 'subj-1', '2026-10-05')
      expect(match).toBeDefined()
      expect(match?.id).toBe('sess-1')
      expect(match?.type).toBe('regular')
    })

    it('matches session by subject object ID and date', () => {
      const match = matchExistingSession(existingSessions as any, 'subj-2', '2026-10-05')
      expect(match).toBeDefined()
      expect(match?.id).toBe('sess-2')
      expect(match?.type).toBe('no-class')
    })

    it('returns null when no session is materialized yet', () => {
      const match = matchExistingSession(existingSessions as any, 'subj-3', '2026-10-05')
      expect(match).toBeNull()
    })
  })

  describe('getWeekdayAbbrev', () => {
    it('converts Date or YYYY-MM-DD to Manila weekday abbreviation', () => {
      // 2026-10-05 is a Monday
      expect(getWeekdayAbbrev('2026-10-05')).toBe('mon')
      // 2026-10-06 is a Tuesday
      expect(getWeekdayAbbrev('2026-10-06')).toBe('tue')
    })
  })
})
