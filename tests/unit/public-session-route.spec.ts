import { describe, expect, it } from 'vitest'
import { getPublicSessionPageData } from '@/lib/data/public-views'

describe('Public Classmate Session Attendance Route (Ticket P3)', () => {
  const mockSubject = {
    id: 'subj-1',
    code: 'CS101',
    name: 'Algorithms',
    slug: 'cs101-slug',
    professor: 'Dr. Turing',
    schedule: [{ weekday: 'mon', start: '08:00', end: '10:00' }],
    internalNote: 'TOP SECRET PROFESSOR PHONE', // 🔒 Private
  }

  const mockStudents = [
    { id: 'stu-1', name: 'Alice Santos', studentNumber: '2024-0001' },
    { id: 'stu-2', name: 'Bob Reyes', studentNumber: '2024-0002' },
    { id: 'stu-3', name: 'Charlie Cruz', studentNumber: '2024-0003' },
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
          recitations: 3,
          internalFlag: 'review_needed', // 🔒 Private
        },
        {
          student: mockStudents[1],
          attendance: 'E',
          excuseReason: 'Medical leave with doctor note', // 📋 Report-only
          proofStorageId: 'secret-file-999', // 🔒 Private
          proofUrl: 'https://...', // 🔒 Private
        },
        {
          student: mockStudents[2],
          attendance: 'A',
          recitations: 0,
        },
      ],
    },
    {
      id: 'sess-draft',
      subject: 'subj-1',
      date: '2026-10-02',
      _status: 'draft',
      entries: [
        {
          student: mockStudents[0],
          attendance: 'P',
          recitations: 1,
        },
      ],
    },
    {
      id: 'sess-noclass',
      subject: 'subj-1',
      date: '2026-10-03',
      kind: 'noClass',
      noClassReason: 'Typhoon Suspension',
      _status: 'published',
      entries: [],
    },
  ]

  const mockEnrollments = [
    { id: 'enr-2', student: mockStudents[1], status: 'active' },
    { id: 'enr-1', student: mockStudents[0], status: 'active' },
    { id: 'enr-3', student: mockStudents[2], status: 'active' },
  ]

  const createMockPayload = () => ({
    find: async ({ collection, where }: any) => {
      if (collection === 'subjects') {
        const targetSlug = where?.and?.[0]?.slug?.equals
        if (targetSlug === 'cs101-slug') {
          return { docs: [mockSubject] }
        }
        return { docs: [] }
      }
      if (collection === 'sessions') {
        const targetDate = where?.and?.find((c: any) => c.date)?.date?.equals
        const targetStatus = where?.and?.find((c: any) => c._status)?.status ?? where?.and?.find((c: any) => c._status)?._status?.equals
        const matched = mockSessions.filter((s) => {
          if (targetDate && s.date !== targetDate) return false
          if (targetStatus && s._status !== targetStatus) return false
          return true
        })
        return { docs: matched }
      }
      if (collection === 'enrollments') {
        return { docs: mockEnrollments }
      }
      return { docs: [] }
    },
  })

  it('resolves published session with computed stats and alphabetical entries', async () => {
    const payload = createMockPayload()
    const data = await getPublicSessionPageData(payload as any, 'cs101-slug', '2026-10-01')

    expect(data).not.toBeNull()
    expect(data?.subject.code).toBe('CS101')
    expect(data?.session.id).toBe('sess-pub')
    expect(data?.session.date).toBe('2026-10-01')

    // Stats
    expect(data?.stats.totalStudents).toBe(3)
    expect(data?.stats.presentCount).toBe(1)
    expect(data?.stats.excusedCount).toBe(1)
    expect(data?.stats.absentCount).toBe(1)
    expect(data?.stats.totalRecitations).toBe(3)
    expect(data?.stats.attendanceRate).toBe(33.3)

    // Alphabetical order of entries: Alice, Bob, Charlie
    expect(data?.session.entries[0].student.name).toBe('Alice Santos')
    expect(data?.session.entries[1].student.name).toBe('Bob Reyes')
    expect(data?.session.entries[2].student.name).toBe('Charlie Cruz')
  })

  it('strictly excludes 🔒 private and 📋 report-only fields (Zero-Leak Guarantee)', async () => {
    const payload = createMockPayload()
    const data = await getPublicSessionPageData(payload as any, 'cs101-slug', '2026-10-01')

    // Subject level
    expect((data?.subject as any).internalNote).toBeUndefined()

    // Entries level
    const alice = data?.session.entries.find((e) => e.student.id === 'stu-1')
    expect(alice).toBeDefined()
    expect((alice as any).internalFlag).toBeUndefined()

    const bob = data?.session.entries.find((e) => e.student.id === 'stu-2')
    expect(bob).toBeDefined()
    expect((bob as any).excuseReason).toBeUndefined()
    expect((bob as any).proofStorageId).toBeUndefined()
    expect((bob as any).proofUrl).toBeUndefined()
  })

  it('returns null (404) for draft session to prevent leakage before publishing', async () => {
    const payload = createMockPayload()
    const data = await getPublicSessionPageData(payload as any, 'cs101-slug', '2026-10-02')

    expect(data).toBeNull()
  })

  it('returns null (404) for unknown session date or unknown subject slug', async () => {
    const payload = createMockPayload()
    const unknownDate = await getPublicSessionPageData(payload as any, 'cs101-slug', '2026-12-31')
    expect(unknownDate).toBeNull()

    const unknownSlug = await getPublicSessionPageData(payload as any, 'nonexistent-slug', '2026-10-01')
    expect(unknownSlug).toBeNull()
  })

  it('resolves cancelled / noClass session with cancellation reason', async () => {
    const payload = createMockPayload()
    const data = await getPublicSessionPageData(payload as any, 'cs101-slug', '2026-10-03')

    expect(data).not.toBeNull()
    expect(data?.session.kind).toBe('noClass')
    expect(data?.session.noClassReason).toBe('Typhoon Suspension')
    expect(data?.stats.totalStudents).toBe(0)
  })

  it('provides complete sorted active roster for dispute sheet student selector', async () => {
    const payload = createMockPayload()
    const data = await getPublicSessionPageData(payload as any, 'cs101-slug', '2026-10-01')

    expect(data?.roster).toHaveLength(3)
    expect(data?.roster[0].name).toBe('Alice Santos')
    expect(data?.roster[1].name).toBe('Bob Reyes')
    expect(data?.roster[2].name).toBe('Charlie Cruz')
  })
})
