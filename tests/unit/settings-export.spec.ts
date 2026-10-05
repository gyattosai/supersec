import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/settings/export/route'

vi.mock('payload', () => ({
  getPayload: vi.fn(),
}))

vi.mock('@/payload.config', () => ({
  default: {},
}))

import { getPayload } from 'payload'

describe('Settings Database Export (Ticket 17)', () => {
  it('returns 401 when request is unauthenticated', async () => {
    ;(getPayload as any).mockResolvedValue({
      auth: vi.fn().mockResolvedValue({ user: null }),
    })

    const req = new Request('http://localhost:3000/api/settings/export')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('serializes all collections with metadata and counts when authenticated', async () => {
    ;(getPayload as any).mockResolvedValue({
      auth: vi.fn().mockResolvedValue({
        user: { email: 'matthew.balubar@gmail.com' },
      }),
      find: vi.fn().mockImplementation(({ collection }) => {
        return Promise.resolve({
          docs: [{ id: `${collection}-1` }],
          totalDocs: 1,
        })
      }),
    })

    const req = new Request('http://localhost:3000/api/settings/export', {
      headers: { cookie: 'payload-token=valid-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="supersec-backup-')

    const body = await res.json()
    expect(body._meta.app).toBe('SuperSec')
    expect(body._meta.exportedBy).toBe('matthew.balubar@gmail.com')
    expect(body.counts.subjects).toBe(1)
    expect(body.counts.sessions).toBe(1)
    expect(body.data.subjects).toHaveLength(1)
  })
})
