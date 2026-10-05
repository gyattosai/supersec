import { describe, it, expect } from 'vitest'
import {
  slugifyPostTitle,
  isAnnouncementPinned,
  validatePublishInput,
} from '@/lib/posts/lifecycle'

describe('Post Domain Lifecycle & Slug Engine (Ticket 01)', () => {
  describe('slugifyPostTitle', () => {
    it('converts title to clean lowercase kebab case with 4 random alphanumeric suffix', () => {
      const slug = slugifyPostTitle('Midterm Exam Schedule & Room Assignments!')
      expect(slug).toMatch(/^midterm-exam-schedule-room-assignments-[a-z0-9]{4}$/)
    })

    it('handles special characters, accents, and excessive whitespace', () => {
      const slug = slugifyPostTitle('   Syllabus Update   (v2.0) -- Important!   ')
      expect(slug).toMatch(/^syllabus-update-v2-0-important-[a-z0-9]{4}$/)
    })

    it('provides a sensible fallback for titles with no alphanumeric characters', () => {
      const slug = slugifyPostTitle('??? !!! ###')
      expect(slug).toMatch(/^post-[a-z0-9]{4}$/)
    })

    it('generates unique slugs for the same title', () => {
      const slug1 = slugifyPostTitle('Project Guidelines')
      const slug2 = slugifyPostTitle('Project Guidelines')
      expect(slug1).not.toBe(slug2)
    })
  })

  describe('isAnnouncementPinned', () => {
    const today = '2026-10-06'

    it('returns true if pinnedUntil is today or in the future', () => {
      expect(isAnnouncementPinned('2026-10-06', today)).toBe(true)
      expect(isAnnouncementPinned('2026-10-07', today)).toBe(true)
      expect(isAnnouncementPinned('2026-12-31', today)).toBe(true)
    })

    it('returns false if pinnedUntil has expired in the past', () => {
      expect(isAnnouncementPinned('2026-10-05', today)).toBe(false)
      expect(isAnnouncementPinned('2026-09-01', today)).toBe(false)
    })

    it('returns false if pinnedUntil is missing, empty, or undefined', () => {
      expect(isAnnouncementPinned(undefined, today)).toBe(false)
      expect(isAnnouncementPinned(null as any, today)).toBe(false)
      expect(isAnnouncementPinned('', today)).toBe(false)
    })
  })

  describe('validatePublishInput', () => {
    const today = '2026-10-06'

    it('succeeds with valid changeNote for regular post', () => {
      const res = validatePublishInput({
        changeNote: 'Initial class syllabus release',
        todayDate: today,
      })
      expect(res.valid).toBe(true)
      expect(res.error).toBeUndefined()
    })

    it('fails if changeNote is missing or whitespace only', () => {
      expect(validatePublishInput({ changeNote: '', todayDate: today }).valid).toBe(false)
      expect(validatePublishInput({ changeNote: '   ', todayDate: today }).valid).toBe(false)
      expect(validatePublishInput({ changeNote: undefined as any, todayDate: today }).valid).toBe(false)
    })

    it('fails if priority is true but pinnedUntil is missing or in the past', () => {
      expect(
        validatePublishInput({
          changeNote: 'Urgent advisory',
          priority: true,
          pinnedUntil: undefined,
          todayDate: today,
        }).valid,
      ).toBe(false)

      expect(
        validatePublishInput({
          changeNote: 'Urgent advisory',
          priority: true,
          pinnedUntil: '2026-10-05',
          todayDate: today,
        }).valid,
      ).toBe(false)
    })

    it('succeeds when priority is true and pinnedUntil is today or future date', () => {
      const res = validatePublishInput({
        changeNote: 'Urgent exam advisory',
        priority: true,
        pinnedUntil: '2026-10-10',
        todayDate: today,
      })
      expect(res.valid).toBe(true)
    })
  })
})
