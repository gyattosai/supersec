import { describe, expect, it } from 'vitest'
import {
  canPublishSession,
  filterRosterEntries,
  countUnsetStudents,
  calculateSessionLiveScore,
} from '@/lib/roll-call-helpers'

describe('Live Roll Call Screen Helpers & Barriers (Ticket 04)', () => {
  const sampleEntries = [
    { student: { id: 'stu-1', name: 'Alice Santos', studentNumber: '2024-0001' }, attendance: 'P', recitations: 2 },
    { student: { id: 'stu-2', name: 'Bob Reyes', studentNumber: '2024-0002' }, attendance: 'A', recitations: 0 },
    { student: { id: 'stu-3', name: 'Charlie Cruz', studentNumber: '2024-0003' }, attendance: null, recitations: 0 },
  ]

  describe('Rule R1 Publish Barrier Helper', () => {
    it('blocks publish when any active student is Not Set (null)', () => {
      const check = canPublishSession(sampleEntries as any)
      expect(check.canPublish).toBe(false)
      expect(check.unsetCount).toBe(1)
      expect(check.unsetStudentNames).toContain('Charlie Cruz')
    })

    it('allows publish when all students are marked P, A, or E', () => {
      const fullyMarked = [
        { student: { id: 'stu-1', name: 'Alice Santos' }, attendance: 'P' },
        { student: { id: 'stu-2', name: 'Bob Reyes' }, attendance: 'A' },
        { student: { id: 'stu-3', name: 'Charlie Cruz' }, attendance: 'E' },
      ]

      const check = canPublishSession(fullyMarked as any)
      expect(check.canPublish).toBe(true)
      expect(check.unsetCount).toBe(0)
      expect(check.unsetStudentNames).toHaveLength(0)
    })

    it('accurately counts unset students', () => {
      expect(countUnsetStudents(sampleEntries as any)).toBe(1)
    })
  })

  describe('Roster Filtering & Search', () => {
    it('filters entries by student name search query', () => {
      const results = filterRosterEntries(sampleEntries as any, { query: 'alice' })
      expect(results).toHaveLength(1)
      expect(results[0].student.name).toBe('Alice Santos')
    })

    it('filters entries by student number search query', () => {
      const results = filterRosterEntries(sampleEntries as any, { query: '0002' })
      expect(results).toHaveLength(1)
      expect(results[0].student.name).toBe('Bob Reyes')
    })

    it('filters entries to show only students who recited today', () => {
      const results = filterRosterEntries(sampleEntries as any, { recitedOnly: true })
      expect(results).toHaveLength(1)
      expect(results[0].student.name).toBe('Alice Santos')
      expect(results[0].recitations).toBe(2)
    })

    it('filters entries by statusFilter (unset, present, absent, etc.)', () => {
      const unsetResults = filterRosterEntries(sampleEntries as any, { statusFilter: 'unset' })
      expect(unsetResults).toHaveLength(1)
      expect(unsetResults[0].student.name).toBe('Charlie Cruz')

      const absentResults = filterRosterEntries(sampleEntries as any, { statusFilter: 'absent' })
      expect(absentResults).toHaveLength(1)
      expect(absentResults[0].student.name).toBe('Bob Reyes')

      const presentResults = filterRosterEntries(sampleEntries as any, { statusFilter: 'present' })
      expect(presentResults).toHaveLength(1)
      expect(presentResults[0].student.name).toBe('Alice Santos')
    })
  })

  describe('Session Live Scoreboard calculation', () => {
    it('computes real-time presence counts and percentage accurately', () => {
      const entries = [
        { student: { id: 's1', name: 'S1' }, attendance: 'P' },
        { student: { id: 's2', name: 'S2' }, attendance: 'P' },
        { student: { id: 's3', name: 'S3' }, attendance: 'A' },
        { student: { id: 's4', name: 'S4' }, attendance: 'E' },
        { student: { id: 's5', name: 'S5' }, attendance: 'C' },
        { student: { id: 's6', name: 'S6' }, attendance: null },
      ]

      const score = calculateSessionLiveScore(entries as any)
      expect(score.total).toBe(6)
      expect(score.present).toBe(2)
      expect(score.absent).toBe(1)
      expect(score.excused).toBe(1)
      expect(score.conflict).toBe(1)
      expect(score.unset).toBe(1)
      // Attendance % = Present / (Present + Absent) = 2 / (2 + 1) = 67%
      expect(score.attendancePercentage).toBe(67)
    })
  })
})
