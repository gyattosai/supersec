import { describe, expect, it } from 'vitest'
import { getProfessorReport } from '@/lib/data/reports'

describe('Professor Report Data Projections (Stage 1.12 / Issue #13 - ADR 0002 & ADR 0009)', () => {
  it('returns status "not_found" when token does not exist', async () => {
    const mockPayload = {
      find: async () => ({ docs: [] }),
    }

    const report = await getProfessorReport(mockPayload as any, 'invalid-token')
    expect(report.status).toBe('not_found')
  })

  it('returns status "revoked" with timestamp when link has been revoked (ADR 0009)', async () => {
    const mockPayload = {
      find: async ({ collection }: any) => {
        if (collection === 'reportLinks') {
          return {
            docs: [
              {
                id: 'link-1',
                token: 'revoked-token-123',
                revokedAt: '2026-10-01T12:00:00.000Z',
                subject: 'subj-1',
              },
            ],
          }
        }
        return { docs: [] }
      },
    }

    const report = await getProfessorReport(mockPayload as any, 'revoked-token-123')
    expect(report.status).toBe('revoked')
    if (report.status !== 'revoked') throw new Error('Expected revoked')
    expect(report.revokedAt).toBe('2026-10-01T12:00:00.000Z')
  })

  it('computes attendance %, absences, streaks, and recitations for published sessions', async () => {
    const mockSubject = {
      id: 'subj-1',
      code: 'CS101',
      name: 'Algorithms',
      section: 'A',
      scheduleDays: ['Monday', 'Wednesday'],
      startTime: '08:00',
      endTime: '10:00',
      room: 'Room 302',
      absenceLimit: 4,
    }

    const mockStudents = [
      { id: 'stu-1', name: 'Alice Santos', studentNumber: '2024-0001' },
      { id: 'stu-2', name: 'Bob Reyes', studentNumber: '2024-0002' },
    ]

    const mockEnrollments = [
      { id: 'enr-1', student: mockStudents[0], status: 'active', displayOrder: 1 },
      { id: 'enr-2', student: mockStudents[1], status: 'active', displayOrder: 2 },
    ]

    const mockSessions = [
      {
        id: 'sess-1',
        subject: 'subj-1',
        date: '2026-09-01',
        _status: 'published',
        type: 'regular',
        entries: [
          { student: 'stu-1', attendance: 'P', recitations: 1 },
          { student: 'stu-2', attendance: 'A', recitations: 0 },
        ],
      },
      {
        id: 'sess-2',
        subject: 'subj-1',
        date: '2026-09-03',
        _status: 'published',
        type: 'regular',
        entries: [
          { student: 'stu-1', attendance: 'P', recitations: 2 },
          { student: 'stu-2', attendance: 'E', excuseReason: 'Flu fever', recitations: 0 },
        ],
      },
      {
        id: 'sess-3',
        subject: 'subj-1',
        date: '2026-09-08',
        _status: 'published',
        type: 'regular',
        entries: [
          { student: 'stu-1', attendance: 'P', recitations: 0 },
          { student: 'stu-2', attendance: 'A', recitations: 0 },
        ],
      },
      {
        id: 'sess-draft', // Draft session must NOT be included in professor report
        subject: 'subj-1',
        date: '2026-09-10',
        _status: 'draft',
        type: 'regular',
        entries: [
          { student: 'stu-1', attendance: 'A', recitations: 0 },
          { student: 'stu-2', attendance: 'A', recitations: 0 },
        ],
      },
    ]

    const mockPayload = {
      find: async ({ collection, where }: any) => {
        if (collection === 'reportLinks') {
          return {
            docs: [
              {
                id: 'link-active',
                token: 'valid-token-32-chars-long-1234567',
                revokedAt: null,
                subject: 'subj-1',
              },
            ],
          }
        }
        if (collection === 'subjects') {
          return { docs: [mockSubject] }
        }
        if (collection === 'sessions') {
          // Filter only published sessions
          return { docs: mockSessions.filter((s) => s._status === 'published') }
        }
        if (collection === 'enrollments') {
          return { docs: mockEnrollments }
        }
        return { docs: [] }
      },
    }

    const report = await getProfessorReport(mockPayload as any, 'valid-token-32-chars-long-1234567')

    expect(report.status).toBe('active')
    if (report.status !== 'active') throw new Error('Expected active')
    expect(report.subject.code).toBe('CS101')
    expect(report.heldSessionsCount).toBe(3) // 3 published sessions, draft excluded

    const alice = report.students.find((s: any) => s.id === 'stu-1')
    const bob = report.students.find((s: any) => s.id === 'stu-2')
    expect(alice).toBeDefined()
    expect(bob).toBeDefined()
    if (!alice || !bob) throw new Error('Students not found')

    expect(alice.presentCount).toBe(3)
    expect(alice.absentCount).toBe(0)
    expect(alice.excusedCount).toBe(0)
    expect(alice.attendancePercentage).toBe(100)
    expect(alice.recitationsCount).toBe(3)
    expect(alice.flag).toBe('none')
    expect(alice.streak).toBe(0)

    expect(bob.presentCount).toBe(0)
    expect(bob.absentCount).toBe(2)
    expect(bob.excusedCount).toBe(1)
    // Held: 3, Excused: 1 => Held - Excused = 2. Present: 0 => 0%
    expect(bob.attendancePercentage).toBe(0)
    expect(bob.recitationsCount).toBe(0)
    // Absence limit is 4. Bob has 2 absences => 50% => 'watch'
    expect(bob.flag).toBe('watch')
    // Streak: Sess 1 was A, Sess 2 was E (skipped), Sess 3 was A => Streak is 2 (Rule R2)
    expect(bob.streak).toBe(2)
  })

  it('filters sessions by fromDate and toDate range', async () => {
    const mockSubject = {
      id: 'subj-1',
      code: 'CS101',
      name: 'Algorithms',
      absenceLimit: 4,
    }

    const mockStudents = [{ id: 'stu-1', name: 'Alice Santos', studentNumber: '2024-0001' }]
    const mockEnrollments = [{ id: 'enr-1', student: mockStudents[0], status: 'active', displayOrder: 1 }]

    const mockSessions = [
      {
        id: 'sess-1',
        subject: 'subj-1',
        date: '2026-09-01',
        _status: 'published',
        entries: [{ student: 'stu-1', attendance: 'P', recitations: 1 }],
      },
      {
        id: 'sess-2',
        subject: 'subj-1',
        date: '2026-09-15',
        _status: 'published',
        entries: [{ student: 'stu-1', attendance: 'P', recitations: 2 }],
      },
      {
        id: 'sess-3',
        subject: 'subj-1',
        date: '2026-10-01',
        _status: 'published',
        entries: [{ student: 'stu-1', attendance: 'P', recitations: 3 }],
      },
    ]

    const mockPayload = {
      find: async ({ collection }: any) => {
        if (collection === 'reportLinks') return { docs: [{ id: 'l1', token: 'tok', revokedAt: null, subject: 'subj-1' }] }
        if (collection === 'subjects') return { docs: [mockSubject] }
        if (collection === 'sessions') return { docs: mockSessions }
        if (collection === 'enrollments') return { docs: mockEnrollments }
        return { docs: [] }
      },
    }

    const report = await getProfessorReport(mockPayload as any, 'tok', {
      fromDate: '2026-09-10',
      toDate: '2026-09-20',
    })

    expect(report.status).toBe('active')
    if (report.status !== 'active') throw new Error('Expected active')
    expect(report.heldSessionsCount).toBe(1) // Only sess-2 falls within range
    expect(report.students[0].recitationsCount).toBe(2)
  })

  it('strictly excludes private fields like internalNote or student personal excuse proof files (ADR 0002)', async () => {
    const mockSubject = {
      id: 'subj-1',
      code: 'CS101',
      name: 'Algorithms',
      internalNote: 'SECRET PROFESSOR NOTE', // 🔒 Private field
    }

    const mockStudents = [{ id: 'stu-1', name: 'Alice Santos', studentNumber: '2024-0001' }]
    const mockEnrollments = [{ id: 'enr-1', student: mockStudents[0], status: 'active', displayOrder: 1 }]

    const mockSessions = [
      {
        id: 'sess-1',
        subject: 'subj-1',
        date: '2026-09-01',
        _status: 'published',
        entries: [
          {
            student: 'stu-1',
            attendance: 'E',
            excuseReason: 'Private medical issue',
            proofStorageId: 'secret-file-id', // 🔒 Private field
          },
        ],
      },
    ]

    const mockPayload = {
      find: async ({ collection }: any) => {
        if (collection === 'reportLinks') return { docs: [{ id: 'l1', token: 'tok', revokedAt: null, subject: 'subj-1' }] }
        if (collection === 'subjects') return { docs: [mockSubject] }
        if (collection === 'sessions') return { docs: mockSessions }
        if (collection === 'enrollments') return { docs: mockEnrollments }
        return { docs: [] }
      },
    }

    const report = await getProfessorReport(mockPayload as any, 'tok')
    expect(report.status).toBe('active')
    if (report.status !== 'active') throw new Error('Expected active')

    // Verify 🔒 private fields are not present on subject or students
    expect((report.subject as any).internalNote).toBeUndefined()
    expect((report.students[0] as any).proofStorageId).toBeUndefined()
    expect((report.students[0] as any).excuseReason).toBeUndefined()
  })
})
