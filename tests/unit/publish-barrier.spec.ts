import { describe, expect, it } from 'vitest'
import { validatePublishableSession } from '@/collections/Sessions'
import { publishSession } from '@/lib/data/sessions'

describe('Rule R1 Publish Barrier & Versioned Change Notes (Stage 1.7 / Issue #8)', () => {
  describe('Rule R1 Validation Logic (ADR 0007)', () => {
    it('allows publishing when all entries are resolved (P, A, or E) and changeNote is provided', () => {
      const data = {
        kind: 'class',
        _status: 'published',
        changeNote: 'Initial roll call published',
        entries: [
          { student: 'stu-1', attendance: 'P', recitations: 0 },
          { student: 'stu-2', attendance: 'A', recitations: 0 },
          { student: 'stu-3', attendance: 'E', recitations: 0 },
        ],
      }

      const result = validatePublishableSession(data)
      expect(result.isValid).toBe(true)
    })

    it('strictly blocks publishing when any entry is Not Set (null or empty string) (Rule R1)', () => {
      const data = {
        kind: 'class',
        _status: 'published',
        changeNote: 'Trying to publish incomplete roll call',
        entries: [
          { student: 'stu-1', attendance: 'P', recitations: 0 },
          { student: 'stu-2', attendance: null, recitations: 0 }, // Not Set!
        ],
      }

      const result = validatePublishableSession(data)
      expect(result.isValid).toBe(false)
      expect(result.error).toMatch(/Cannot publish session: 1 student\(s\) still marked Not Set/)
    })

    it('strictly blocks publishing when changeNote is empty', () => {
      const data = {
        kind: 'class',
        _status: 'published',
        changeNote: '   ',
        entries: [{ student: 'stu-1', attendance: 'P', recitations: 0 }],
      }

      const result = validatePublishableSession(data)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('A change note is required when publishing a session')
    })

    it('does not enforce Not Set check on No Class sessions', () => {
      const data = {
        kind: 'noClass',
        _status: 'published',
        changeNote: 'Holiday announced',
        noClassReason: 'National Holiday',
        entries: [],
      }

      const result = validatePublishableSession(data)
      expect(result.isValid).toBe(true)
    })
  })

  describe('publishSession Seam', () => {
    it('publishes session when all rows resolved and changeNote supplied', async () => {
      let updatedData: any
      const mockSession = {
        id: 'sess-1',
        kind: 'class',
        entries: [
          { student: 'stu-1', attendance: 'P', recitations: 0 },
          { student: 'stu-2', attendance: 'P', recitations: 1 },
        ],
      }

      const mockPayload = {
        findByID: async () => mockSession,
        update: async ({ id, data }: { id: string; data: any }) => {
          expect(id).toBe('sess-1')
          updatedData = data
          return { id, ...data }
        },
      }

      const published = await publishSession(mockPayload as any, 'sess-1', 'Final attendance review')

      expect(published._status).toBe('published')
      expect(published.phase).toBe('finished')
      expect(updatedData._status).toBe('published')
      expect(updatedData.changeNote).toBe('Final attendance review')
    })

    it('rejects publishSession if entries contain Not Set rows', async () => {
      const mockSession = {
        id: 'sess-1',
        kind: 'class',
        entries: [
          { student: 'stu-1', attendance: 'P', recitations: 0 },
          { student: 'stu-2', attendance: null, recitations: 0 },
        ],
      }

      const mockPayload = {
        findByID: async () => mockSession,
        update: async () => ({}),
      }

      await expect(
        publishSession(mockPayload as any, 'sess-1', 'Attempting publish'),
      ).rejects.toThrow('Cannot publish session: 1 student(s) still marked Not Set')
    })
  })
})
