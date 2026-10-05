import { describe, expect, it } from 'vitest'
import { Sessions } from '@/collections/Sessions'
import { startSession, markNoClass } from '@/lib/data/sessions'

describe('Sessions Collection & Materialization (Stage 1.5 / Issue #6)', () => {
  describe('Schema & Invariants', () => {
    it('has slug "sessions" with versioning enabled', () => {
      expect(Sessions.slug).toBe('sessions')
      expect(Sessions.versions).toBeDefined()
      const versions = Sessions.versions as any
      expect(versions?.drafts).toBeDefined()
    })

    it('defines expected fields from SCHEMA.md §3', () => {
      const fieldNames = Sessions.fields.map((f) => ('name' in f ? f.name : ''))
      expect(fieldNames).toContain('subject')
      expect(fieldNames).toContain('date')
      expect(fieldNames).toContain('kind')
      expect(fieldNames).toContain('phase')
      expect(fieldNames).toContain('noClassReason')
      expect(fieldNames).toContain('entries')
      expect(fieldNames).toContain('changeNote')
    })
  })

  describe('startSession Seam', () => {
    it('initializes a class session with active enrollments and Not Set entries', async () => {
      let createdDoc: any
      const mockActiveStudents = [
        { id: 'stu-1', enrollmentId: 'enr-1' },
        { id: 'stu-2', enrollmentId: 'enr-2' },
      ]

      const mockPayload = {
        find: async ({ collection }: { collection: string }) => {
          if (collection === 'sessions') return { docs: [] } // No duplicate
          if (collection === 'enrollments') {
            return {
              docs: mockActiveStudents.map((s) => ({
                id: s.enrollmentId,
                student: { id: s.id },
                status: 'active',
                enrolledOn: '2026-10-01',
              })),
            }
          }
          return { docs: [] }
        },
        create: async ({ collection, data }: { collection: string; data: any }) => {
          expect(collection).toBe('sessions')
          createdDoc = { id: 'sess-1', ...data }
          return createdDoc
        },
      }

      const session = await startSession(mockPayload as any, {
        subjectId: 'subj-1',
        date: '2026-10-05',
      })

      expect(session.id).toBe('sess-1')
      expect(session.kind).toBe('class')
      expect(session.phase).toBe('live')
      expect(session.entries).toHaveLength(2)

      // All entries must initialize to Not Set (null / empty) and 0 recitations
      expect(session.entries?.[0].attendance).toBeFalsy()
      expect(session.entries?.[0].recitations).toBe(0)
      expect(session.entries?.[1].attendance).toBeFalsy()
      expect(session.entries?.[1].recitations).toBe(0)
    })

    it('rejects creating duplicate sessions on the same class day (Rules R7, R8)', async () => {
      const mockPayload = {
        find: async ({ collection }: { collection: string }) => {
          if (collection === 'sessions') {
            return { docs: [{ id: 'existing-session', date: '2026-10-05' }] }
          }
          return { docs: [] }
        },
        create: async () => {
          throw new Error('Should not reach create')
        },
      }

      await expect(
        startSession(mockPayload as any, {
          subjectId: 'subj-1',
          date: '2026-10-05',
        }),
      ).rejects.toThrow('A session already exists for this subject on 2026-10-05')
    })
  })

  describe('markNoClass Seam', () => {
    it('creates a published No Class session with specified reason', async () => {
      let createdDoc: any
      const mockPayload = {
        find: async () => ({ docs: [] }), // No duplicate
        create: async ({ collection, data }: { collection: string; data: any }) => {
          expect(collection).toBe('sessions')
          createdDoc = { id: 'no-class-1', ...data }
          return createdDoc
        },
      }

      const session = await markNoClass(mockPayload as any, {
        subjectId: 'subj-1',
        date: '2026-10-07',
        reason: 'Typhoon Suspension',
      })

      expect(session.kind).toBe('noClass')
      expect(session.phase).toBe('finished')
      expect(session.noClassReason).toBe('Typhoon Suspension')
      expect(session._status).toBe('published')
    })

    it('requires a non-empty reason when marking No Class', async () => {
      const mockPayload = {
        find: async () => ({ docs: [] }),
        create: async () => ({}),
      }

      await expect(
        markNoClass(mockPayload as any, {
          subjectId: 'subj-1',
          date: '2026-10-07',
          reason: '   ',
        }),
      ).rejects.toThrow('A reason is required when marking No Class')
    })
  })
})
