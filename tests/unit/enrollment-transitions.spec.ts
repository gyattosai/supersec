import { describe, expect, it } from 'vitest'
import {
  dropStudent,
  setConflictFlag,
  getActiveEnrollments,
  type RosterStudent,
} from '@/lib/data/students'

describe('Enrollment Status Transitions & Conflict Flags (Stage 1.4 / Issue #5)', () => {
  describe('dropStudent & setConflictFlag Seam', () => {
    it('updates enrollment status to dropped with effective Manila date', async () => {
      let updatedData: any
      const mockPayload = {
        update: async ({ id, data }: { id: string; data: any }) => {
          expect(id).toBe('enr-1')
          updatedData = data
          return { id, ...data }
        },
      }

      const result = await dropStudent(mockPayload as any, 'enr-1', '2026-10-15')
      expect(result.status).toBe('dropped')
      expect(result.droppedOn).toBe('2026-10-15')
      expect(updatedData.status).toBe('dropped')
      expect(updatedData.droppedOn).toBe('2026-10-15')
    })

    it('rejects invalid Manila date format for droppedOn', async () => {
      const mockPayload = { update: async () => ({}) }
      await expect(dropStudent(mockPayload as any, 'enr-1', 'invalid-date')).rejects.toThrow(
        'Dropped date must be in YYYY-MM-DD format',
      )
    })

    it('toggles conflictFlag without affecting public fields', async () => {
      let updatedData: any
      const mockPayload = {
        update: async ({ id, data }: { id: string; data: any }) => {
          expect(id).toBe('enr-2')
          updatedData = data
          return { id, ...data }
        },
      }

      const result = await setConflictFlag(mockPayload as any, 'enr-2', true)
      expect(result.conflictFlag).toBe(true)
      expect(updatedData.conflictFlag).toBe(true)
    })
  })

  describe('Active Roster Date Boundary Filtering', () => {
    const mockRoster: RosterStudent[] = [
      {
        id: 'stu-1',
        enrollmentId: 'enr-1',
        lastName: 'Santos',
        firstName: 'Juan',
        displayOrder: 1,
        status: 'active',
        enrolledOn: '2026-10-01',
      },
      {
        id: 'stu-2',
        enrollmentId: 'enr-2',
        lastName: 'Reyes',
        firstName: 'Maria',
        displayOrder: 2,
        status: 'dropped',
        enrolledOn: '2026-10-01',
        droppedOn: '2026-10-15', // Dropped on Oct 15
      },
      {
        id: 'stu-3',
        enrollmentId: 'enr-3',
        lastName: 'Cruz',
        firstName: 'Pedro',
        displayOrder: 3,
        status: 'active',
        enrolledOn: '2026-10-10', // Enrolled late on Oct 10
      },
    ]

    it('includes dropped student on sessions on or before droppedOn date', () => {
      // Session on Oct 12: stu-1 (active), stu-2 (dropped on 15, so still active on 12), stu-3 (enrolled on 10)
      const onOct12 = getActiveEnrollments(mockRoster, '2026-10-12')
      expect(onOct12.map((s) => s.id)).toEqual(['stu-1', 'stu-2', 'stu-3'])
    })

    it('excludes dropped student on sessions strictly after droppedOn date', () => {
      // Session on Oct 20: stu-2 was dropped on Oct 15, so must be excluded
      const onOct20 = getActiveEnrollments(mockRoster, '2026-10-20')
      expect(onOct20.map((s) => s.id)).toEqual(['stu-1', 'stu-3'])
    })

    it('excludes late-enrolled student on sessions strictly before enrolledOn date', () => {
      // Session on Oct 05: stu-3 enrolled on Oct 10, so must be excluded
      const onOct05 = getActiveEnrollments(mockRoster, '2026-10-05')
      expect(onOct05.map((s) => s.id)).toEqual(['stu-1', 'stu-2'])
    })
  })
})
