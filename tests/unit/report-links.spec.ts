import { describe, expect, it } from 'vitest'
import { ReportLinks } from '@/collections/ReportLinks'
import {
  createReportLink,
  revokeReportLink,
  resetReportLink,
  getReportLinkByToken,
} from '@/lib/data/reports'

describe('Tokenized Report Links (Stage 1.11 / Issue #12 - ADR 0004 & ADR 0009)', () => {
  describe('Schema & Access Rules', () => {
    it('enforces hard deletion ban on ReportLinks collection (ADR 0004)', () => {
      expect(typeof ReportLinks.access?.delete).toBe('function')
      const deleteAccess = ReportLinks.access?.delete as (args: any) => boolean
      expect(deleteAccess({ req: { user: { id: 'admin-1' } } })).toBe(false)
      expect(deleteAccess({ req: { user: null } })).toBe(false)
    })

    it('forbids unauthenticated reads on ReportLinks collection', () => {
      const readAccess = ReportLinks.access?.read as (args: any) => boolean
      expect(readAccess({ req: { user: null } })).toBe(false)
      expect(readAccess({ req: { user: { id: 'sec-1' } } })).toBe(true)
    })

    it('indexes token with unique constraint', () => {
      const tokenField = ReportLinks.fields.find((f: any) => f.name === 'token') as any
      expect(tokenField).toBeDefined()
      expect(tokenField.unique).toBe(true)
      expect(tokenField.index).toBe(true)
    })
  })

  describe('Domain Seam Operations', () => {
    it('creates a new report link with high-entropy token', async () => {
      let createdDoc: any
      const mockPayload = {
        create: async ({ data }: any) => {
          createdDoc = { id: 'link-1', ...data }
          return createdDoc
        },
      }

      const link = await createReportLink(mockPayload as any, { subjectId: 'subj-1' })
      expect(link.id).toBe('link-1')
      expect(link.token).toBeDefined()
      expect(typeof link.token).toBe('string')
      expect(link.token.length).toBeGreaterThanOrEqual(32)
      expect(link.revokedAt).toBeNull()
      expect(link.subject).toBe('subj-1')
    })

    it('revokes an existing report link', async () => {
      let updatedDoc: any
      const mockPayload = {
        update: async ({ id, data }: any) => {
          updatedDoc = { id, ...data }
          return updatedDoc
        },
      }

      const revoked = await revokeReportLink(mockPayload as any, 'link-1')
      expect(revoked.id).toBe('link-1')
      expect(revoked.revokedAt).toBeDefined()
      expect(new Date(revoked.revokedAt!).getTime()).not.toBeNaN()
    })

    it('resets a report link by revoking previous links and issuing a fresh token', async () => {
      const activeLink = {
        id: 'link-old',
        subject: 'subj-1',
        token: 'old-token-12345678901234567890123456789012',
        revokedAt: null,
      }

      const revokedLinks: any[] = []
      let createdNewLink: any

      const mockPayload = {
        find: async ({ collection, where }: any) => {
          if (collection === 'reportLinks') {
            const hasRevokedNull =
              where?.revokedAt?.equals === null ||
              where?.and?.some((c: any) => c.revokedAt?.equals === null)
            if (hasRevokedNull) {
              return { docs: [activeLink] }
            }
          }
          return { docs: [] }
        },
        update: async ({ id, data }: any) => {
          const rev = { id, ...data }
          revokedLinks.push(rev)
          return rev
        },
        create: async ({ data }: any) => {
          createdNewLink = { id: 'link-new', ...data }
          return createdNewLink
        },
      }

      const newLink = await resetReportLink(mockPayload as any, 'subj-1')
      expect(revokedLinks.length).toBe(1)
      expect(revokedLinks[0].id).toBe('link-old')
      expect(revokedLinks[0].revokedAt).toBeDefined()

      expect(newLink.id).toBe('link-new')
      expect(newLink.token).not.toBe(activeLink.token)
      expect(newLink.revokedAt).toBeNull()
    })

    it('finds report link by token (both active and revoked)', async () => {
      const mockLink = {
        id: 'link-1',
        token: 'token-abc-12345678901234567890123456789012',
        revokedAt: '2026-10-01T00:00:00.000Z',
      }

      const mockPayload = {
        find: async ({ where }: any) => {
          if (where?.token?.equals === mockLink.token) {
            return { docs: [mockLink] }
          }
          return { docs: [] }
        },
      }

      const found = await getReportLinkByToken(mockPayload as any, mockLink.token)
      expect(found).not.toBeNull()
      expect(found?.id).toBe('link-1')
      expect(found?.revokedAt).toBe('2026-10-01T00:00:00.000Z')

      const notFound = await getReportLinkByToken(mockPayload as any, 'non-existent')
      expect(notFound).toBeNull()
    })
  })
})
