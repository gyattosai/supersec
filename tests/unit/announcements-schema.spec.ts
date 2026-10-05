import { describe, expect, it } from 'vitest'
import { Announcements } from '@/collections/Announcements'

describe('Announcements Collection & Schema (Ticket 02)', () => {
  it('has slug "announcements" with drafts enabled', () => {
    expect(Announcements.slug).toBe('announcements')
    expect(Announcements.versions).toBeDefined()
    const versions = Announcements.versions as any
    expect(versions?.drafts).toBe(true)
  })

  it('defines expected fields from SCHEMA.md §Announcement', () => {
    const fieldNames = Announcements.fields.map((f) => ('name' in f ? f.name : ''))
    expect(fieldNames).toContain('title')
    expect(fieldNames).toContain('slug')
    expect(fieldNames).toContain('body')
    expect(fieldNames).toContain('image')
    expect(fieldNames).toContain('priority')
    expect(fieldNames).toContain('pinnedUntil')
    expect(fieldNames).toContain('publishedAt')
    expect(fieldNames).toContain('changeNote')
    expect(fieldNames).toContain('archivedAt')
    expect(fieldNames).toContain('subjects')
  })

  it('enforces title as required field', () => {
    const titleField = Announcements.fields.find(
      (f) => 'name' in f && f.name === 'title',
    ) as any
    expect(titleField).toBeDefined()
    expect(titleField?.required).toBe(true)
  })
})
