import { describe, expect, it } from 'vitest'
import {
  recordAttendance,
  adjustRecitation,
  markAllPresent,
  type SessionEntry,
} from '@/lib/data/sessions'

describe('In-Session Roll Call Operations (Stage 1.6 / Issue #7)', () => {
  describe('recordAttendance Seam', () => {
    it('updates attendance status of the targeted student entry', async () => {
      let updatedEntries: SessionEntry[] = []
      const mockSession = {
        id: 'sess-1',
        entries: [
          { student: 'stu-1', attendance: null, recitations: 0 },
          { student: 'stu-2', attendance: null, recitations: 0 },
        ],
      }

      const mockPayload = {
        findByID: async () => mockSession,
        update: async ({ id, data }: { id: string; data: any }) => {
          expect(id).toBe('sess-1')
          updatedEntries = data.entries
          return { id, ...data }
        },
      }

      await recordAttendance(mockPayload as any, 'sess-1', 'stu-1', 'P')
      expect(updatedEntries[0].attendance).toBe('P')
      expect(updatedEntries[1].attendance).toBeNull()
    })

    it('rejects invalid attendance codes (must be P, A, E, or null)', async () => {
      const mockPayload = { findByID: async () => ({ id: 'sess-1', entries: [] }) }
      await expect(
        recordAttendance(mockPayload as any, 'sess-1', 'stu-1', 'L' as any),
      ).rejects.toThrow('Invalid attendance status: L')
    })
  })

  describe('adjustRecitation Seam', () => {
    it('increments recitation count and optionally updates recitation topic', async () => {
      let updatedEntries: SessionEntry[] = []
      const mockSession = {
        id: 'sess-1',
        entries: [
          { student: 'stu-1', attendance: 'P', recitations: 1, recitationTopic: 'Lexical trees' },
        ],
      }

      const mockPayload = {
        findByID: async () => mockSession,
        update: async ({ id, data }: { id: string; data: any }) => {
          updatedEntries = data.entries
          return { id, ...data }
        },
      }

      await adjustRecitation(mockPayload as any, 'sess-1', 'stu-1', 1, 'MongoDB indexing')
      expect(updatedEntries[0].recitations).toBe(2)
      expect(updatedEntries[0].recitationTopic).toBe('MongoDB indexing')
    })

    it('decrements recitation count without dropping below zero', async () => {
      let updatedEntries: SessionEntry[] = []
      const mockSession = {
        id: 'sess-1',
        entries: [{ student: 'stu-1', attendance: 'P', recitations: 0 }],
      }

      const mockPayload = {
        findByID: async () => mockSession,
        update: async ({ id, data }: { id: string; data: any }) => {
          updatedEntries = data.entries
          return { id, ...data }
        },
      }

      await adjustRecitation(mockPayload as any, 'sess-1', 'stu-1', -1)
      expect(updatedEntries[0].recitations).toBe(0) // Floor at 0
    })
  })

  describe('markAllPresent Seam (Rule R1)', () => {
    it('fills only remaining Not Set entries with Present, leaving P, A, and E untouched', async () => {
      let updatedEntries: SessionEntry[] = []
      const mockSession = {
        id: 'sess-1',
        entries: [
          { student: 'stu-1', attendance: null, recitations: 0 }, // Not Set -> P
          { student: 'stu-2', attendance: 'A', recitations: 0 }, // Absent -> MUST REMAIN A
          { student: 'stu-3', attendance: 'E', recitations: 0 }, // Excused -> MUST REMAIN E
          { student: 'stu-4', attendance: 'P', recitations: 2 }, // Already Present -> MUST REMAIN P
          { student: 'stu-5', attendance: null, recitations: 0 }, // Not Set -> P
        ],
      }

      const mockPayload = {
        findByID: async () => mockSession,
        update: async ({ id, data }: { id: string; data: any }) => {
          updatedEntries = data.entries
          return { id, ...data }
        },
      }

      const result = await markAllPresent(mockPayload as any, 'sess-1')

      expect(result.updatedCount).toBe(2) // stu-1 and stu-5
      expect(updatedEntries[0].attendance).toBe('P')
      expect(updatedEntries[1].attendance).toBe('A') // Unchanged!
      expect(updatedEntries[2].attendance).toBe('E') // Unchanged!
      expect(updatedEntries[3].attendance).toBe('P') // Unchanged!
      expect(updatedEntries[4].attendance).toBe('P')
    })
  })
})
