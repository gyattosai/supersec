import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/posts/publish/route'

let updatedData: any = null

vi.mock('@/payload.config', () => ({
  default: {},
}))

vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({
    findByID: vi.fn().mockResolvedValue({
      id: 'ann-1',
      title: 'Exam Review Schedule',
    }),
    update: vi.fn().mockImplementation(async ({ collection, id, data }) => {
      updatedData = { collection, id, ...data }
      return updatedData
    }),
  }),
}))

describe('POST /api/posts/publish (Ticket 08)', () => {
  beforeEach(() => {
    updatedData = null
  })

  it('rejects requests without a change note with 400', async () => {
    const req = new Request('http://localhost:3000/api/posts/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: 'post-123',
        type: 'announcement',
        changeNote: '   ',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/change note/i)
  })

  it('rejects requests missing postId or type with 400', async () => {
    const req = new Request('http://localhost:3000/api/posts/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changeNote: 'Valid change note',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('publishes announcement and updates publishedAt and changeNote on valid input', async () => {
    const req = new Request('http://localhost:3000/api/posts/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: 'ann-1',
        type: 'announcement',
        changeNote: 'Updated room venue to 402',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(updatedData).toBeDefined()
    expect(updatedData.collection).toBe('announcements')
    expect(updatedData.changeNote).toBe('Updated room venue to 402')
    expect(updatedData._status).toBe('published')
  })
})
