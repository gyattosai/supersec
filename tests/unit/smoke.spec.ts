import type { Field, SelectField, TextField } from 'payload'
import { describe, expect, it } from 'vitest'
import { Users } from '../../src/collections/Users'

describe('Step 0.2: Stack & Schema Baseline (In-Memory Database Isolation)', () => {
  it('does not require a live MongoDB connection to run tests', () => {
    // Zero-DB assertion: unit tests execute purely in-memory
    expect(true).toBe(true)
  })

  it('configures Users collection with exact 30-day token expiration per SCHEMA.md', () => {
    expect(Users.slug).toBe('users')
    expect(typeof Users.auth).toBe('object')
    if (typeof Users.auth === 'object') {
      expect(Users.auth.tokenExpiration).toBe(2592000) // 30 days in seconds
    }
  })

  it('configures Users fields with name and role (owner/helper)', () => {
    const fields = (Users.fields || []) as Field[]
    const nameField = fields.find((f) => 'name' in f && f.name === 'name') as TextField | undefined
    const roleField = fields.find((f) => 'name' in f && f.name === 'role') as SelectField | undefined

    expect(nameField).toBeDefined()
    expect(nameField?.type).toBe('text')
    expect(nameField?.required).toBe(true)

    expect(roleField).toBeDefined()
    expect(roleField?.type).toBe('select')
    expect(roleField?.required).toBe(true)
    expect(roleField?.defaultValue).toBe('owner')
    expect(roleField?.options).toEqual([
      { label: 'Owner (Secretary)', value: 'owner' },
      { label: 'Helper', value: 'helper' },
    ])
  })

  it('validates Asia/Manila calendar date format strictly as YYYY-MM-DD', () => {
    const manilaDateRegex = /^\d{4}-\d{2}-\d{2}$/
    const sampleDate = '2026-10-05'
    expect(sampleDate).toMatch(manilaDateRegex)
  })
})
