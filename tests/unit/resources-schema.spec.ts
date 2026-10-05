import { describe, expect, it } from 'vitest'
import { Resources } from '@/collections/Resources'

describe('Resources Collection & Schema (Ticket 04)', () => {
  it('has slug "resources" with drafts enabled', () => {
    expect(Resources.slug).toBe('resources')
    expect(Resources.versions).toBeDefined()
    const versions = Resources.versions as any
    expect(versions?.drafts).toBe(true)
  })

  it('defines expected fields from SCHEMA.md §Resource', () => {
    const fieldNames = Resources.fields.map((f) => ('name' in f ? f.name : ''))
    expect(fieldNames).toContain('title')
    expect(fieldNames).toContain('slug')
    expect(fieldNames).toContain('url')
    expect(fieldNames).toContain('category')
    expect(fieldNames).toContain('attachments')
    expect(fieldNames).toContain('body')
    expect(fieldNames).toContain('publishedAt')
    expect(fieldNames).toContain('changeNote')
    expect(fieldNames).toContain('archivedAt')
    expect(fieldNames).toContain('subjects')
  })

  it('enforces title as required field', () => {
    const titleField = Resources.fields.find(
      (f) => 'name' in f && f.name === 'title',
    ) as any
    expect(titleField).toBeDefined()
    expect(titleField?.required).toBe(true)
  })
})
