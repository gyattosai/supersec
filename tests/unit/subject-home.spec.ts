import { describe, expect, it } from 'vitest'
import {
  computeNextMeeting,
  projectSubjectHomeHeader,
  type SubjectScheduleSlot,
} from '@/lib/subjects/subject-home'

describe('Subject Home Hub & Quick Actions (Ticket 01)', () => {
  const sampleSchedule: SubjectScheduleSlot[] = [
    { weekday: 'tue', start: '18:00', end: '19:30' },
    { weekday: 'fri', start: '18:00', end: '19:30' },
  ]

  describe('Next Meeting Computation', () => {
    it('returns the upcoming meeting on the next scheduled weekday', () => {
      // Monday Oct 5, 2026 -> next is Tuesday Oct 6, 2026
      const nextMeeting = computeNextMeeting(sampleSchedule, '2026-10-05', '14:00')
      expect(nextMeeting).not.toBeNull()
      expect(nextMeeting?.date).toBe('2026-10-06')
      expect(nextMeeting?.weekday).toBe('tue')
      expect(nextMeeting?.start).toBe('18:00')
      expect(nextMeeting?.end).toBe('19:30')
      expect(nextMeeting?.isToday).toBe(false)
    })

    it('identifies if next meeting is happening today before end time', () => {
      // Tuesday Oct 6, 2026 at 15:00 -> meeting is today at 18:00
      const nextMeeting = computeNextMeeting(sampleSchedule, '2026-10-06', '15:00')
      expect(nextMeeting).not.toBeNull()
      expect(nextMeeting?.date).toBe('2026-10-06')
      expect(nextMeeting?.isToday).toBe(true)
    })

    it('rolls over to next scheduled day if today meeting has ended', () => {
      // Tuesday Oct 6, 2026 at 20:00 -> next meeting is Friday Oct 9, 2026
      const nextMeeting = computeNextMeeting(sampleSchedule, '2026-10-06', '20:00')
      expect(nextMeeting).not.toBeNull()
      expect(nextMeeting?.date).toBe('2026-10-09')
      expect(nextMeeting?.weekday).toBe('fri')
      expect(nextMeeting?.isToday).toBe(false)
    })

    it('handles empty schedule gracefully', () => {
      const nextMeeting = computeNextMeeting([], '2026-10-05', '12:00')
      expect(nextMeeting).toBeNull()
    })
  })

  describe('Subject Home Header Projection', () => {
    it('projects header fields correctly including public URL and next class badge', () => {
      const subject = {
        id: 'subj-123',
        code: 'OLCBSTM01',
        name: 'Strategic Management',
        sectionMark: 'OLCA113N001',
        professor: 'Sir Ariel Casimiro',
        slug: 'olcbstm01-k7q2',
        schedule: sampleSchedule,
      }

      const header = projectSubjectHomeHeader(subject, '2026-10-05', '14:00')

      expect(header.subjectId).toBe('subj-123')
      expect(header.code).toBe('OLCBSTM01')
      expect(header.name).toBe('Strategic Management')
      expect(header.sectionMark).toBe('OLCA113N001')
      expect(header.professor).toBe('Sir Ariel Casimiro')
      expect(header.publicUrl).toBe('/s/olcbstm01-k7q2')
      expect(header.nextMeetingBadge).toContain('Tue 18:00–19:30')
    })
  })
})
