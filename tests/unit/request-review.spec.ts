import { describe, expect, it } from 'vitest'
import { reviewRequest } from '@/lib/data/requests'

describe('Secretary Request Review Seam (Stage 1.9 / Issue #10 - Rules R3 & R5)', () => {
  it('blocks approval if target session has uncommitted draft edits (Rule R3)', async () => {
    const mockRequest = {
      id: 'req-1',
      session: 'sess-draft',
      student: 'stu-1',
      type: 'present',
      status: 'pending',
    }

    const mockPayload = {
      find: async ({ collection, where }: any) => {
        if (collection === 'requests') {
          return { docs: [mockRequest] }
        }
        if (collection === 'sessions') {
          return {
            docs: [
              {
                id: 'sess-draft',
                _status: 'draft',
                entries: [{ student: 'stu-1', attendance: 'A', recitations: 0 }],
              },
            ],
          }
        }
        return { docs: [] }
      },
      update: async () => ({}),
    }

    await expect(
      reviewRequest(mockPayload as any, {
        requestId: 'req-1',
        decision: 'approved',
      }),
    ).rejects.toThrow('Cannot approve request while target session has unpublished draft edits (Rule R3)')
  })

  it('approving an "I recited" request adds count delta without overwriting in-class taps (Rule R5)', async () => {
    const mockRequest = {
      id: 'req-2',
      session: 'sess-pub',
      student: 'stu-1',
      type: 'recited',
      count: 2,
      topic: 'Vector Spaces',
      status: 'pending',
    }

    let updatedSession: any
    let updatedRequest: any

    const mockPayload = {
      find: async ({ collection }: any) => {
        if (collection === 'requests') {
          return { docs: [mockRequest] }
        }
        if (collection === 'sessions') {
          return {
            docs: [
              {
                id: 'sess-pub',
                _status: 'published',
                entries: [
                  { student: 'stu-1', attendance: 'P', recitations: 1 },
                  { student: 'stu-2', attendance: 'P', recitations: 3 },
                ],
              },
            ],
          }
        }
        return { docs: [] }
      },
      update: async ({ collection, data }: any) => {
        if (collection === 'sessions') {
          updatedSession = data
          return { id: 'sess-pub', ...data }
        }
        if (collection === 'requests') {
          updatedRequest = data
          return { id: 'req-2', ...data }
        }
      },
    }

    const result = await reviewRequest(mockPayload as any, {
      requestId: 'req-2',
      decision: 'approved',
    })

    expect(result.status).toBe('approved')
    expect(updatedRequest.status).toBe('approved')
    expect(updatedRequest.decidedAt).toBeDefined()

    // Recitation delta added (1 + 2 = 3)
    const stu1Entry = updatedSession.entries.find((e: any) => e.student === 'stu-1')
    expect(stu1Entry.recitations).toBe(3)
    // In-class attendance tap preserved
    expect(stu1Entry.attendance).toBe('P')

    // stu-2 unaffected
    const stu2Entry = updatedSession.entries.find((e: any) => e.student === 'stu-2')
    expect(stu2Entry.recitations).toBe(3)
  })

  it('approving an "I was present" request changes attendance to P', async () => {
    const mockRequest = {
      id: 'req-3',
      session: 'sess-pub',
      student: 'stu-1',
      type: 'present',
      status: 'pending',
    }

    let updatedSession: any
    const mockPayload = {
      find: async ({ collection }: any) => {
        if (collection === 'requests') return { docs: [mockRequest] }
        if (collection === 'sessions') {
          return {
            docs: [
              {
                id: 'sess-pub',
                _status: 'published',
                entries: [{ student: 'stu-1', attendance: 'A', recitations: 0 }],
              },
            ],
          }
        }
        return { docs: [] }
      },
      update: async ({ collection, data }: any) => {
        if (collection === 'sessions') updatedSession = data
        return data
      },
    }

    await reviewRequest(mockPayload as any, {
      requestId: 'req-3',
      decision: 'approved',
    })

    const entry = updatedSession.entries.find((e: any) => e.student === 'stu-1')
    expect(entry.attendance).toBe('P')
  })

  it('approving an "Excuse" request changes attendance to E and stores excuseReason', async () => {
    const mockRequest = {
      id: 'req-4',
      session: 'sess-pub',
      student: 'stu-1',
      type: 'excuse',
      reason: 'Medical appointment',
      status: 'pending',
    }

    let updatedSession: any
    const mockPayload = {
      find: async ({ collection }: any) => {
        if (collection === 'requests') return { docs: [mockRequest] }
        if (collection === 'sessions') {
          return {
            docs: [
              {
                id: 'sess-pub',
                _status: 'published',
                entries: [{ student: 'stu-1', attendance: 'A', recitations: 0 }],
              },
            ],
          }
        }
        return { docs: [] }
      },
      update: async ({ collection, data }: any) => {
        if (collection === 'sessions') updatedSession = data
        return data
      },
    }

    await reviewRequest(mockPayload as any, {
      requestId: 'req-4',
      decision: 'approved',
    })

    const entry = updatedSession.entries.find((e: any) => e.student === 'stu-1')
    expect(entry.attendance).toBe('E')
    expect(entry.excuseReason).toBe('Medical appointment')
  })

  it('declining a request does not modify session entries', async () => {
    const mockRequest = {
      id: 'req-5',
      session: 'sess-pub',
      student: 'stu-1',
      type: 'present',
      status: 'pending',
    }

    let sessionUpdated = false
    let updatedRequest: any

    const mockPayload = {
      find: async ({ collection }: any) => {
        if (collection === 'requests') return { docs: [mockRequest] }
        if (collection === 'sessions') {
          return {
            docs: [
              {
                id: 'sess-pub',
                _status: 'published',
                entries: [{ student: 'stu-1', attendance: 'A', recitations: 0 }],
              },
            ],
          }
        }
        return { docs: [] }
      },
      update: async ({ collection, data }: any) => {
        if (collection === 'sessions') sessionUpdated = true
        if (collection === 'requests') updatedRequest = data
        return data
      },
    }

    await reviewRequest(mockPayload as any, {
      requestId: 'req-5',
      decision: 'declined',
    })

    expect(sessionUpdated).toBe(false)
    expect(updatedRequest.status).toBe('declined')
    expect(updatedRequest.decidedAt).toBeDefined()
  })
})
