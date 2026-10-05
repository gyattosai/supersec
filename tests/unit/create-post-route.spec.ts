import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/posts/create/route'

let createdDoc: any = null

vi.mock('@/payload.config', () => ({
  default: {},
}))

vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({
    create: vi.fn().mockImplementation(async ({ collection, data }) => {
      createdDoc = { id: 'new-doc-1', collection, ...data }
      return createdDoc
    }),
  }),
}))

describe('POST /api/posts/create (Ticket 09)', () => {
  beforeEach(() => {
    createdDoc = null
  })

  it('rejects requests missing type or subjectId with 400', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Sample Title' }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('creates an announcement draft successfully', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'announcement',
          subjectId: 'subj-1',
          title: 'Class Project Instructions',
          priority: true,
          pinnedUntil: '2026-10-15',
        }),
      }),
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(createdDoc.collection).toBe('announcements')
    expect(createdDoc.title).toBe('Class Project Instructions')
    expect(createdDoc.priority).toBe(true)
    expect(createdDoc.pinnedUntil).toBe('2026-10-15')
    expect(createdDoc._status).toBe('draft')
  })

  it('creates a resource post successfully', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'resource',
          subjectId: 'subj-1',
          title: 'Google Drive Lecture Notes',
          url: 'https://drive.google.com/notes',
          category: 'Notes',
        }),
      }),
    )

    expect(res.status).toBe(200)
    expect(createdDoc.collection).toBe('resources')
    expect(createdDoc.url).toBe('https://drive.google.com/notes')
    expect(createdDoc.category).toBe('Notes')
  })

  it('creates a question post successfully', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'question',
          subjectId: 'subj-1',
          title: 'When is the term paper due?',
          official: true,
          tags: ['deadlines', 'paper'],
        }),
      }),
    )

    expect(res.status).toBe(200)
    expect(createdDoc.collection).toBe('questions')
    expect(createdDoc.question).toBe('When is the term paper due?')
    expect(createdDoc.official).toBe(true)
    expect(createdDoc.tags).toEqual(['deadlines', 'paper'])
  })
})
