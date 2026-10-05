import { describe, expect, it, vi } from 'vitest'

let mockToken: string | undefined = undefined

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: vi.fn().mockImplementation((name: string) => {
      if (name === 'payload-token' && mockToken) {
        return { value: mockToken }
      }
      return undefined
    }),
  })),
}))

vi.mock('@/payload.config', () => ({
  default: {},
}))

vi.mock('payload', () => ({
  getPayload: vi.fn().mockImplementation(async () => ({})),
}))

vi.mock('@/lib/data/sessions', () => ({
  markGlobalNoClass: vi.fn().mockImplementation(async (_payload, data) => ({
    success: true,
    date: data.date,
    reason: data.reason,
    affectedSubjectIds: ['subj-1', 'subj-2'],
    createdSessionIds: ['sess-1', 'sess-2'],
    skippedSubjectIds: [],
  })),
}))

import { POST } from '@/app/api/sessions/global-no-class/route'

describe('Global No Class API Route (Ticket 10)', () => {
  it('returns 401 when unauthenticated', async () => {
    mockToken = undefined
    const req = new Request('http://localhost/api/sessions/global-no-class', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-10-05', reason: 'Typhoon' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when date is missing', async () => {
    mockToken = 'valid-jwt-token'
    const req = new Request('http://localhost/api/sessions/global-no-class', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Typhoon' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('date')
  })

  it('returns 400 when reason is missing or empty', async () => {
    mockToken = 'valid-jwt-token'
    const req = new Request('http://localhost/api/sessions/global-no-class', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-10-05', reason: '   ' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('reason')
  })

  it('returns 200 with result on successful execution', async () => {
    mockToken = 'valid-jwt-token'
    const req = new Request('http://localhost/api/sessions/global-no-class', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-10-05',
        reason: 'Typhoon Suspension Signal No. 2',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.affectedSubjectIds).toEqual(['subj-1', 'subj-2'])
  })
})
