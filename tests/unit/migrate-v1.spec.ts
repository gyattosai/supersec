import { describe, expect, it, vi, beforeEach } from 'vitest'
import { runV1Migration } from '@/lib/data/migrate-v1'

describe('v1 to v2 Data Migration Engine (Isolated Test)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('orchestrates subjects, students, enrollments, and sessions migration idempotently', async () => {
    const mockSubjects = [
      {
        $id: 'v1-sub-1',
        publicId: 'pubsub1',
        code: 'CS101',
        name: 'Computer Science 1',
        professorName: 'Prof Vance',
        meetingDaysJson: '[{"weekday":1,"startTime":"08:00","endTime":"10:00"}]',
      },
    ]

    const mockStudents = [
      {
        $id: 'v1-stu-1',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        middleName: 'M',
        canonicalName: 'Dela Cruz, Juan M.',
      },
    ]

    const mockSubjectStudents = [
      {
        $id: 'v1-ss-1',
        subjectId: 'v1-sub-1',
        studentId: 'v1-stu-1',
        membershipState: 'active',
        hasScheduleConflict: true,
        displayOrder: 1,
      },
    ]

    const mockClassSessions = [
      {
        $id: 'v1-sess-1',
        subjectId: 'v1-sub-1',
        startsAt: '2026-08-28T07:45:00.000Z',
        sessionState: 'completed',
        publishState: 'published',
      },
    ]

    const mockAttendanceRecords = [
      {
        $id: 'v1-rec-1',
        classSessionId: 'v1-sess-1',
        subjectStudentId: 'v1-ss-1',
        attendanceStatus: 'CONFLICT',
      },
    ]

    // Mock global fetch for Appwrite endpoints
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/collections/subjects/')) {
        return { ok: true, json: async () => ({ documents: mockSubjects, total: 1 }) }
      }
      if (url.includes('/collections/students/')) {
        return { ok: true, json: async () => ({ documents: mockStudents, total: 1 }) }
      }
      if (url.includes('/collections/subjectStudents/')) {
        return { ok: true, json: async () => ({ documents: mockSubjectStudents, total: 1 }) }
      }
      if (url.includes('/collections/classSessions/')) {
        return { ok: true, json: async () => ({ documents: mockClassSessions, total: 1 }) }
      }
      if (url.includes('/collections/attendanceRecords/')) {
        return { ok: true, json: async () => ({ documents: mockAttendanceRecords, total: 1 }) }
      }
      return { ok: true, json: async () => ({ documents: [], total: 0 }) }
    }) as any

    const createdDocs: Record<string, any[]> = {
      terms: [],
      subjects: [],
      students: [],
      enrollments: [],
      sessions: [],
    }

    const mockPayload = {
      find: async ({ collection, where }: any) => {
        const docs = createdDocs[collection] || []
        // check legacyRowId
        const legacyId = where?.legacyRowId?.equals
        if (legacyId) {
          return { docs: docs.filter((d) => d.legacyRowId === legacyId) }
        }
        return { docs: [] }
      },
      create: async ({ collection, data }: any) => {
        const doc = { id: `${collection}-${Date.now()}`, ...data }
        createdDocs[collection].push(doc)
        return doc
      },
      update: async ({ collection, id, data }: any) => {
        const idx = createdDocs[collection].findIndex((d) => d.id === id)
        if (idx !== -1) {
          createdDocs[collection][idx] = { ...createdDocs[collection][idx], ...data }
          return createdDocs[collection][idx]
        }
        return { id, ...data }
      },
    }

    const stats = await runV1Migration(mockPayload as any)

    expect(stats.terms).toBe(1)
    expect(stats.subjects).toBe(1)
    expect(stats.students).toBe(1)
    expect(stats.enrollments).toBe(1)
    expect(stats.sessions).toBe(1)
    expect(stats.attendanceRecordsProcessed).toBe(1)

    // Verify created session entries mapped CONFLICT to C
    const sessionDoc = createdDocs.sessions[0]
    expect(sessionDoc).toBeDefined()
    expect(sessionDoc.date).toBe('2026-08-28') // Manila date
    expect(sessionDoc.entries[0].attendance).toBe('C')
  })
})
