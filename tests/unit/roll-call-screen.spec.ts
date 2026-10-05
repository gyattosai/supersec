import { describe, expect, it } from 'vitest'
import {
  canPublishSession,
  filterRosterEntries,
  countUnsetStudents,
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
  })
})
