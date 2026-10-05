import { describe, expect, it } from 'vitest'
import { Questions } from '@/collections/Questions'

describe('Questions Collection & Schema (Ticket 06)', () => {
  it('has slug "questions" with drafts enabled', () => {
    expect(Questions.slug).toBe('questions')
    expect(Questions.versions).toBeDefined()
    const versions = Questions.versions as any
    expect(versions?.drafts).toBe(true)
  })

  it('defines expected fields from SCHEMA.md §Question', () => {
    const fieldNames = Questions.fields.map((f) => ('name' in f ? f.name : ''))
    expect(fieldNames).toContain('question')
    expect(fieldNames).toContain('slug')
    expect(fieldNames).toContain('answer')
    expect(fieldNames).toContain('tags')
    expect(fieldNames).toContain('official')
    expect(fieldNames).toContain('publishedAt')
    expect(fieldNames).toContain('changeNote')
    expect(fieldNames).toContain('archivedAt')
    expect(fieldNames).toContain('subjects')
  })

  it('enforces question as required field', () => {
    const questionField = Questions.fields.find(
      (f) => 'name' in f && f.name === 'question',
    ) as any
    expect(questionField).toBeDefined()
    expect(questionField?.required).toBe(true)
  })
})
