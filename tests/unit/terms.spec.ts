import { describe, expect, it } from 'vitest'
import { Terms } from '@/collections/Terms'
import { createTerm, getActiveTerm, validateTermDates } from '@/lib/data/terms'

describe('Terms Collection & Domain Data Seam (Stage 1.1 / Issue #2)', () => {
  describe('Schema & Access Rules', () => {
    it('has the slug "terms"', () => {
      expect(Terms.slug).toBe('terms')
    })

    it('permanently bans hard deletion (ADR 0004)', () => {
      expect(typeof Terms.access?.delete).toBe('function')
      const deleteAccess = Terms.access?.delete as (...args: unknown[]) => boolean
      expect(deleteAccess()).toBe(false)
    })

    it('defines name, startDate, and endDate as required fields', () => {
      const fieldNames = Terms.fields.map((f) => ('name' in f ? f.name : ''))
      expect(fieldNames).toContain('name')
      expect(fieldNames).toContain('startDate')
      expect(fieldNames).toContain('endDate')
    })
  })

  describe('Manila Date Validation (ADR 0001)', () => {
    it('accepts valid YYYY-MM-DD date strings', () => {
      expect(validateTermDates('2026-08-17', '2026-12-18')).toEqual({ isValid: true })
    })

    it('rejects malformed date strings not matching YYYY-MM-DD regex', () => {
      expect(validateTermDates('2026/08/17', '2026-12-18')).toEqual({
        isValid: false,
        error: 'Start date must be in YYYY-MM-DD format',
      })
      expect(validateTermDates('2026-08-17T00:00:00Z', '2026-12-18')).toEqual({
        isValid: false,
        error: 'Start date must be in YYYY-MM-DD format',
      })
      expect(validateTermDates('2026-8-17', '2026-12-18')).toEqual({
        isValid: false,
        error: 'Start date must be in YYYY-MM-DD format',
      })
    })

    it('rejects when endDate is strictly before startDate', () => {
      expect(validateTermDates('2026-12-18', '2026-08-17')).toEqual({
        isValid: false,
        error: 'End date must be on or after start date',
      })
    })
  })

  describe('Domain Access Seam: src/lib/data/terms.ts (ADR 0005)', () => {
    it('creates a term via payload when validation passes', async () => {
      const createdDocs: unknown[] = []
      const mockPayload = {
        create: async ({ collection, data }: { collection: string; data: unknown }) => {
          expect(collection).toBe('terms')
          const doc = { id: 'term-1', ...(data as object), createdAt: new Date().toISOString() }
          createdDocs.push(doc)
          return doc
        },
      }

      const term = await createTerm(mockPayload as any, {
        name: '1st Sem AY 2026-2027',
        startDate: '2026-08-17',
        endDate: '2026-12-18',
      })

      expect(term.id).toBe('term-1')
      expect(term.name).toBe('1st Sem AY 2026-2027')
      expect(term.startDate).toBe('2026-08-17')
      expect(term.endDate).toBe('2026-12-18')
    })

    it('throws validation error when invalid dates are passed to createTerm', async () => {
      const mockPayload = {
        create: async () => {
          throw new Error('Should not reach payload create')
        },
      }

      await expect(
        createTerm(mockPayload as any, {
          name: 'Invalid Term',
          startDate: '2026-12-18',
          endDate: '2026-08-17',
        }),
      ).rejects.toThrow('End date must be on or after start date')
    })

    it('queries active term spanning the target date', async () => {
      const mockDocs = [
        {
          id: 'term-1',
          name: '1st Sem AY 2026-2027',
          startDate: '2026-08-17',
          endDate: '2026-12-18',
        },
      ]

      const mockPayload = {
        find: async ({ collection, where }: { collection: string; where: any }) => {
          expect(collection).toBe('terms')
          return { docs: mockDocs }
        },
      }

      const activeTerm = await getActiveTerm(mockPayload as any, '2026-10-05')
      expect(activeTerm).not.toBeNull()
      expect(activeTerm?.name).toBe('1st Sem AY 2026-2027')
    })
  })
})
