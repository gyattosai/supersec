import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/sessions/[id]/ops/route'

let mockSession = {
  id: 'sess-123',
  entries: [
    { student: 'stu-1', attendance: null, recitations: 0 },
    { student: 'stu-2', attendance: 'A', recitations: 1 },
  ],
}

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (name: string) => (name === 'payload-token' ? { value: 'valid-token' } : undefined),
  }),
}))

vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({
    find: vi.fn().mockImplementation(async () => ({ docs: [mockSession] })),
    update: vi.fn().mockImplementation(async ({ data }: any) => {
      mockSession = { ...mockSession, ...data }
      return mockSession
    }),
  }),
}))

vi.mock('@/payload.config', () => ({
  default: {},
}))

describe('Session Ops Route Handler (POST /api/sessions/[id]/ops)', () => {
  it('applies batch attendance and recitation ops to session entries', async () => {
    const req = new Request('http://localhost/api/sessions/sess-123/ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ops: [
          {
            idempotencyKey: 'op-1',
            type: 'set_attendance',
            studentId: 'stu-1',
            attendance: 'P',
          },
          {
            idempotencyKey: 'op-2',
            type: 'adjust_recitation',
            studentId: 'stu-2',
            delta: 1,
            topic: 'Matrices',
          },
        ],
      }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'sess-123' }) })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.processedKeys).toEqual(['op-1', 'op-2'])

    const stu1 = json.entries.find((e: any) => e.student === 'stu-1')
    expect(stu1.attendance).toBe('P')

    const stu2 = json.entries.find((e: any) => e.student === 'stu-2')
    expect(stu2.recitations).toBe(2)
  })
})
