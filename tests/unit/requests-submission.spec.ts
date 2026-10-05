import { describe, expect, it } from 'vitest'
import { Requests } from '@/collections/Requests'
import { RateLimits } from '@/collections/RateLimits'
import { checkRateLimit, submitClassmateRequest } from '@/lib/data/requests'

describe('Public Dispute Submission & Rate Limiting (Stage 1.8 / Issue #9)', () => {
  describe('Schema & Access Rules', () => {
    it('disallows public read on requests collection (ADR 0002)', () => {
      expect(typeof Requests.access?.read).toBe('function')
      const readAccess = Requests.access?.read as (args: any) => boolean
      // Unauthenticated public reads are rejected
      expect(readAccess({ req: { user: null } })).toBe(false)
      // Authenticated secretary reads are allowed
      expect(readAccess({ req: { user: { id: 'sec-1' } } })).toBe(true)
    })

    it('has TTL index on expiresAt for rateLimits collection (ADR 0009)', () => {
      const expiresAtField = RateLimits.fields.find((f: any) => f.name === 'expiresAt') as any
      expect(expiresAtField).toBeDefined()
      expect(expiresAtField.index).toBe(true)
    })
  })

  describe('Rate Limiter Token Bucket Logic', () => {
    it('allows submissions within threshold (max 5 per 10 mins)', async () => {
      const store = new Map<string, { count: number; expiresAt: Date }>()

      const mockPayload = {
        find: async ({ where }: any) => {
          const key = where?.key?.equals
          const entry = store.get(key)
          return { docs: entry ? [{ id: 'rl-1', key, ...entry }] : [] }
        },
        create: async ({ data }: any) => {
          store.set(data.key, { count: data.count, expiresAt: data.expiresAt })
          return { id: 'rl-1', ...data }
        },
        update: async ({ id, data }: any) => {
          for (const [k, v] of store.entries()) {
            store.set(k, { ...v, ...data })
          }
          return { id, ...data }
        },
      }

      // First 5 requests must pass
      for (let i = 1; i <= 5; i++) {
        const check = await checkRateLimit(mockPayload as any, '192.168.1.1', 'submit-request')
        expect(check.allowed).toBe(true)
        expect(check.currentCount).toBe(i)
      }

      // 6th request must be blocked
      const check6 = await checkRateLimit(mockPayload as any, '192.168.1.1', 'submit-request')
      expect(check6.allowed).toBe(false)
      expect(check6.error).toBe('Too many submissions. Please wait 10 minutes before submitting again.')
    })
  })

  describe('submitClassmateRequest Seam', () => {
    it('submits a valid "I was present" request', async () => {
      let createdRequest: any
      const mockPayload = {
        find: async ({ collection }: any) => {
          if (collection === 'rateLimits') return { docs: [] } // Rate limit pass
          if (collection === 'sessions') {
            return { docs: [{ id: 'sess-1', _status: 'published', entries: [{ student: 'stu-1' }] }] }
          }
          if (collection === 'enrollments') {
            return { docs: [{ id: 'enr-1', status: 'active' }] }
          }
          return { docs: [] }
        },
        create: async ({ collection, data }: any) => {
          if (collection === 'requests') {
            createdRequest = { id: 'req-1', ...data }
            return createdRequest
          }
          return { id: 'doc-1', ...data }
        },
      }

      const result = await submitClassmateRequest(mockPayload as any, {
        ip: '10.0.0.1',
        subjectId: 'subj-1',
        sessionId: 'sess-1',
        studentId: 'stu-1',
        type: 'present',
      })

      expect(result.id).toBe('req-1')
      expect(createdRequest.type).toBe('present')
      expect(createdRequest.status).toBe('pending')
    })

    it('requires a reason when submitting an Excuse request', async () => {
      const mockPayload = {
        find: async () => ({ docs: [] }),
        create: async () => ({}),
      }

      await expect(
        submitClassmateRequest(mockPayload as any, {
          ip: '10.0.0.1',
          subjectId: 'subj-1',
          sessionId: 'sess-1',
          studentId: 'stu-1',
          type: 'excuse',
          reason: '   ',
        }),
      ).rejects.toThrow('An excuse reason is required for excuse requests')
    })
  })
})
