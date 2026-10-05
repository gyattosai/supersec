import { describe, expect, it, vi } from 'vitest'

vi.mock('@/payload.config', () => ({
  default: {},
}))

let mockUser: any = null

vi.mock('payload', () => ({
  getPayload: vi.fn().mockImplementation(async () => ({
    auth: vi.fn().mockImplementation(async () => ({ user: mockUser })),
  })),
}))

import { GET, POST } from '@/app/api/reports/token/route'

describe('Professor Report Token API Route (Ticket 07)', () => {
  it('returns 401 Unauthorized when no user is authenticated', async () => {
    mockUser = null
    const req = new Request('http://localhost/api/reports/token?subjectId=subj-1', {
      method: 'GET',
    })

    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 Bad Request when subjectId is missing on GET', async () => {
    mockUser = { id: 'sec-1' }

    const req = new Request('http://localhost/api/reports/token', {
      method: 'GET',
    })

    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('subjectId')
  })

  it('returns 400 Bad Request when subjectId is missing on POST', async () => {
    mockUser = { id: 'sec-1' }

    const req = new Request('http://localhost/api/reports/token', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('subjectId')
  })
})
