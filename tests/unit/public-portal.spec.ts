import { describe, expect, it } from 'vitest'
import { getPublicSubjectPageData } from '@/lib/data/public-views'

describe('Classmate Public Portal & Dispute Sheet (Ticket 06)', () => {
  const mockSubject = {
    id: 'subj-1',
    code: 'CS101',
    name: 'Algorithms',
    slug: 'cs101-abcd',
    professor: 'Dr. Turing',
    schedule: [{ weekday: 'mon', start: '08:00', end: '10:00' }],
    internalNote: 'CONFIDENTIAL NOTE', // 🔒 Private
  }

  const mockStudents = [
    { id: 'stu-1', name: 'Alice Santos', studentNumber: '2024-0001' },
    { id: 'stu-2', name: 'Bob Reyes', studentNumber: '2024-0002' },
  ]

  const mockSessions = [
    {
      id: 'sess-pub',
      subject: 'subj-1',
      date: '2026-10-01',
      _status: 'published',
      entries: [
        {
          student: mockStudents[0],
          attendance: 'P',
          recitations: 2,
          internalFlag: 'review_needed', // 🔒 Private
        },
        {
          student: mockStudents[1],
          attendance: 'E',
          excuseReason: 'Medical leave with doctor note', // 📋 Report-only
          proofStorageId: 'secret-file-999', // 🔒 Private
          proofUrl: 'https://...', // 🔒 Private
        },
      ],
    },
    {
      id: 'sess-draft', // Draft session must NOT be returned in public page data
      subject: 'subj-1',
      date: '2026-10-03',
      _status: 'draft',
      entries: [],
    },
    {
      id: 'sess-noclass',
      subject: 'subj-1',
      date: '2026-10-04',
      kind: 'noClass',
      noClassReason: 'Typhoon Suspension Signal No. 2',
      _status: 'published',
      entries: [],
    },
  ]

  const mockEnrollments = [
    { id: 'enr-2', student: mockStudents[1], status: 'active', displayOrder: 2 },
    { id: 'enr-1', student: mockStudents[0], status: 'active', displayOrder: 1 },
  ]

  const mockPayload = {
    find: async ({ collection, where }: any) => {
      if (collection === 'subjects') {
        if (where?.and?.[0]?.slug?.equals === 'cs101-abcd') {
          return { docs: [mockSubject] }
        }
        return { docs: [] }
      }
      if (collection === 'sessions') {
        return {
          docs: mockSessions.filter((s) => s._status === 'published'),
        }
      }
      if (collection === 'enrollments') {
        return { docs: mockEnrollments }
      }
      return { docs: [] }
    },
  }

  it('fetches subject and published sessions including noClass cancellation notices (zero draft sessions)', async () => {
    const data = await getPublicSubjectPageData(mockPayload as any, 'cs101-abcd')
    expect(data).not.toBeNull()
    expect(data?.subject.code).toBe('CS101')
    expect(data?.sessions).toHaveLength(2)
    // Sorted chronologically descending: 2026-10-04 then 2026-10-01
    expect(data?.sessions[0].id).toBe('sess-noclass')
    expect(data?.sessions[0].kind).toBe('noClass')
    expect(data?.sessions[0].noClassReason).toBe('Typhoon Suspension Signal No. 2')
    expect(data?.sessions[1].id).toBe('sess-pub')
  })

  it('strictly excludes 🔒 private and 📋 report-only fields from public session entries (ADR 0002)', async () => {
    const data = await getPublicSubjectPageData(mockPayload as any, 'cs101-abcd')
    const session = data?.sessions.find((s) => s.id === 'sess-pub')
    expect(session).toBeDefined()

    // Verify 🔒 private fields on subject are not leaked
    expect((data?.subject as any).internalNote).toBeUndefined()

    // Verify student entries
    const alice = session?.entries.find((e: any) => e.student.id === 'stu-1')
    expect(alice).toBeDefined()
    expect(alice!.attendance).toBe('P')
    expect(alice!.recitations).toBe(2)
    expect((alice as any).internalFlag).toBeUndefined()

    const bob = session?.entries.find((e: any) => e.student.id === 'stu-2')
    expect(bob).toBeDefined()
    expect(bob!.attendance).toBe('E')
    // 📋 excuseReason must NEVER be leaked in public classmate view
    expect((bob as any).excuseReason).toBeUndefined()
    // 🔒 proof storage ID and URLs must NEVER be leaked
    expect((bob as any).proofStorageId).toBeUndefined()
    expect((bob as any).proofUrl).toBeUndefined()
  })

  it('provides alphabetical roster list for dispute student selector', async () => {
    const data = await getPublicSubjectPageData(mockPayload as any, 'cs101-abcd')
    expect(data?.roster).toHaveLength(2)
    // Alice before Bob
    expect(data?.roster[0].name).toBe('Alice Santos')
    expect(data?.roster[1].name).toBe('Bob Reyes')
  })
})
