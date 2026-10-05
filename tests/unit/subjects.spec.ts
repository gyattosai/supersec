import { describe, expect, it } from 'vitest'
import {
  Subjects,
  generateSubjectSlug,
  validateMeetingSchedule,
  type MeetingSlot,
} from '@/collections/Subjects'
import {
  computeUpcomingSessions,
  createSubject,
  getPublicSubject,
  PUBLIC_SUBJECT_FIELDS,
} from '@/lib/data/subjects'

describe('Subjects Collection & Domain Data Seam (Stage 1.2 / Issue #3)', () => {
  describe('Schema & Access Rules', () => {
    it('has the slug "subjects"', () => {
      expect(Subjects.slug).toBe('subjects')
    })

    it('permanently bans hard deletion (ADR 0004)', () => {
      expect(typeof Subjects.access?.delete).toBe('function')
      const deleteAccess = Subjects.access?.delete as (...args: unknown[]) => boolean
      expect(deleteAccess()).toBe(false)
    })

    it('defines expected fields from SCHEMA.md §3', () => {
      const fieldNames = Subjects.fields.map((f) => ('name' in f ? f.name : ''))
      expect(fieldNames).toContain('term')
      expect(fieldNames).toContain('name')
      expect(fieldNames).toContain('code')
      expect(fieldNames).toContain('slug')
      expect(fieldNames).toContain('schedule')
      expect(fieldNames).toContain('sectionMark')
      expect(fieldNames).toContain('sectionFull')
      expect(fieldNames).toContain('archivedAt')
    })
  })

  describe('Slug Generation & Schedule Invariants (Rule R8)', () => {
    it('generates a lowercase slug formatted as {code}-{4chars}', () => {
      const slug = generateSubjectSlug('OLCA113')
      expect(slug).toMatch(/^olca113-[a-z0-9]{4}$/)
    })

    it('accepts valid schedule meeting array (max 1 per weekday)', () => {
      const validSchedule: MeetingSlot[] = [
        { weekday: 'mon', start: '08:30', end: '11:30' },
        { weekday: 'thu', start: '13:00', end: '16:00' },
      ]
      expect(validateMeetingSchedule(validSchedule)).toEqual({ isValid: true })
    })

    it('rejects schedule with duplicate meetings on the same weekday (Rule R8)', () => {
      const duplicateWeekdaySchedule: MeetingSlot[] = [
        { weekday: 'mon', start: '08:30', end: '11:30' },
        { weekday: 'mon', start: '13:00', end: '15:00' },
      ]
      expect(validateMeetingSchedule(duplicateWeekdaySchedule)).toEqual({
        isValid: false,
        error: 'Only 1 meeting per weekday is allowed (duplicate: mon)',
      })
    })

    it('rejects meetings where end time is before or equal to start time', () => {
      const invalidTimes: MeetingSlot[] = [{ weekday: 'wed', start: '15:00', end: '14:00' }]
      expect(validateMeetingSchedule(invalidTimes)).toEqual({
        isValid: false,
        error: 'End time must be after start time for wed',
      })
    })
  })

  describe('Virtual Upcoming Sessions Computation (ADR 0006)', () => {
    it('computes scheduled class dates between term start and end', () => {
      const subject = {
        code: 'OLCA113',
        schedule: [
          { weekday: 'mon', start: '08:30', end: '11:30' },
          { weekday: 'wed', start: '08:30', end: '11:30' },
        ],
      }

      // 2026-10-05 is a Monday, 2026-10-18 is a Sunday
      const term = {
        startDate: '2026-10-05',
        endDate: '2026-10-18',
      }

      const upcoming = computeUpcomingSessions(subject as any, term as any, '2026-10-05')

      // Should find:
      // Oct 5 (Mon), Oct 7 (Wed), Oct 12 (Mon), Oct 14 (Wed)
      expect(upcoming.map((s) => s.date)).toEqual([
        '2026-10-05',
        '2026-10-07',
        '2026-10-12',
        '2026-10-14',
      ])
      expect(upcoming[0].start).toBe('08:30')
      expect(upcoming[0].end).toBe('11:30')
    })

    it('excludes dates that fall before fromDate', () => {
      const subject = {
        schedule: [{ weekday: 'mon', start: '08:30', end: '11:30' }],
      }
      const term = {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      }

      // Monday Oct 5 is before Oct 10, so it should not appear
      const upcoming = computeUpcomingSessions(subject as any, term as any, '2026-10-10')
      expect(upcoming.map((s) => s.date)).toEqual(['2026-10-12', '2026-10-19', '2026-10-26'])
    })
  })

  describe('Domain Access Seam: src/lib/data/subjects.ts (ADR 0002, ADR 0005)', () => {
    it('queries public subject using compile-time publicFields allowlist', async () => {
      const mockDoc = {
        id: 'subj-1',
        slug: 'olca113-k7q2',
        code: 'OLCA113',
        name: 'Applications Development',
        professor: 'Prof. Santos',
        sectionMark: 'N001',
        sectionFull: 'OLCA113N001',
        room: 'Lab 402', // Private 🔒
        zoomUrl: 'https://zoom.us/j/123456', // Private 🔒
        schedule: [{ weekday: 'mon', start: '08:30', end: '11:30' }],
      }

      let capturedSelect: Record<string, boolean> | undefined
      const mockPayload = {
        find: async ({
          collection,
          select,
          where,
        }: {
          collection: string
          select?: Record<string, boolean>
          where: any
        }) => {
          expect(collection).toBe('subjects')
          capturedSelect = select
          return { docs: [mockDoc] }
        },
      }

      const subject = await getPublicSubject(mockPayload as any, 'olca113-k7q2')

      expect(subject).not.toBeNull()
      expect(subject?.code).toBe('OLCA113')
      expect(subject?.slug).toBe('olca113-k7q2')

      // Assert compile-time allowlist
      expect(capturedSelect).toBeDefined()
      expect(capturedSelect?.code).toBe(true)
      expect(capturedSelect?.name).toBe(true)
      expect(capturedSelect?.slug).toBe(true)
      // Private fields must never be selected in public queries (ADR 0002)
      expect(capturedSelect?.room).toBeUndefined()
      expect(capturedSelect?.zoomUrl).toBeUndefined()
    })

    it('returns null if subject is soft-deleted (archivedAt is populated)', async () => {
      const mockPayload = {
        find: async () => ({ docs: [] }),
      }

      const subject = await getPublicSubject(mockPayload as any, 'archived-slug')
      expect(subject).toBeNull()
    })
  })
})
