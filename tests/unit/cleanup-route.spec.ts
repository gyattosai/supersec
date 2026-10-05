import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/cron/cleanup/route'

vi.mock('@/lib/data/cleanup', () => ({
  purgeExpiredProofs: vi.fn().mockResolvedValue({
    purgedProofsCount: 3,
    expiredRequestsCount: 2,
    failedDeletionsCount: 0,
  }),
}))

vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/payload.config', () => ({
  default: {},
}))

describe('Cleanup Cron Route Handler (POST /api/cron/cleanup)', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret-123'
  })

  it('rejects requests without matching Bearer token with 401', async () => {
    const req = new Request('http://localhost/api/cron/cleanup', {
      method: 'POST',
      headers: {
        authorization: 'Bearer wrong-secret',
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('rejects requests with missing authorization header', async () => {
    const req = new Request('http://localhost/api/cron/cleanup', {
      method: 'POST',
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('rejects requests when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const req = new Request('http://localhost/api/cron/cleanup', {
      method: 'POST',
      headers: {
        authorization: 'Bearer any-token',
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('executes cleanup and returns stats when authorized', async () => {
    const req = new Request('http://localhost/api/cron/cleanup', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-secret-123',
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.purgedProofsCount).toBe(3)
    expect(json.expiredRequestsCount).toBe(2)
  })

  it('is idempotent on repeated runs', async () => {
    const makeReq = () =>
      new Request('http://localhost/api/cron/cleanup', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-secret-123',
        },
      })

    const res1 = await POST(makeReq())
    const res2 = await POST(makeReq())
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
  })
})
