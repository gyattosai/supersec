import { describe, it, expect, vi } from 'vitest'
import {
  resolveLegacySubjectRedirect,
  resolveLegacyReportRedirect,
} from '@/lib/data/legacy-redirects'

describe('Legacy Link 301 Redirects (Ticket 14, ADR 0012 Phase 5)', () => {
  describe('resolveLegacySubjectRedirect', () => {
    it('returns null if subject is already canonical slug', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [{ id: 'sub-1', slug: 'olca113-k7q2' }],
        }),
      } as any

      const result = await resolveLegacySubjectRedirect(mockPayload, 'olca113-k7q2')
      expect(result).toBeNull() // No redirect needed, already canonical
    })

    it('resolves legacyId to canonical v2 slug destination', async () => {
      const mockPayload = {
        find: vi
          .fn()
          // First call: check if identifier is a canonical slug -> returns empty
          .mockResolvedValueOnce({ docs: [] })
          // Second call: check legacyId / legacyRowId
          .mockResolvedValueOnce({
            docs: [{ id: 'sub-1', slug: 'olca113-k7q2', legacyId: 'OLCA113-1727771234' }],
          }),
      } as any

      const result = await resolveLegacySubjectRedirect(mockPayload, 'OLCA113-1727771234')
      expect(result).toEqual({
        slug: 'olca113-k7q2',
        destination: '/s/olca113-k7q2',
        isPermanent: true,
      })
    })

    it('resolves legacyRowId to canonical v2 slug destination', async () => {
      const mockPayload = {
        find: vi
          .fn()
          .mockResolvedValueOnce({ docs: [] })
          .mockResolvedValueOnce({
            docs: [{ id: 'sub-2', slug: 'olcb114-x9y1', legacyRowId: 'appwrite-row-9988' }],
          }),
      } as any

      const result = await resolveLegacySubjectRedirect(mockPayload, 'appwrite-row-9988')
      expect(result).toEqual({
        slug: 'olcb114-x9y1',
        destination: '/s/olcb114-x9y1',
        isPermanent: true,
      })
    })

    it('returns null when legacy subject identifier is not found', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({ docs: [] }),
      } as any

      const result = await resolveLegacySubjectRedirect(mockPayload, 'non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('resolveLegacyReportRedirect', () => {
    it('resolves legacy report link by legacyId to /prof/:token destination', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 'rep-1',
              token: 'sec-tok-1234567890abcdef1234567890ab',
              legacyId: 'rep-v1-legacy-001',
            },
          ],
        }),
      } as any

      const result = await resolveLegacyReportRedirect(mockPayload, 'rep-v1-legacy-001')
      expect(result).toEqual({
        token: 'sec-tok-1234567890abcdef1234567890ab',
        destination: '/prof/sec-tok-1234567890abcdef1234567890ab',
        isPermanent: true,
      })
    })

    it('resolves legacy report link by legacyRowId to /prof/:token destination', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 'rep-2',
              token: 'sec-tok-abcdef1234567890abcdef123456',
              legacyRowId: 'row-rep-4455',
            },
          ],
        }),
      } as any

      const result = await resolveLegacyReportRedirect(mockPayload, 'row-rep-4455')
      expect(result).toEqual({
        token: 'sec-tok-abcdef1234567890abcdef123456',
        destination: '/prof/sec-tok-abcdef1234567890abcdef123456',
        isPermanent: true,
      })
    })

    it('returns null when legacy report identifier is not found', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({ docs: [] }),
      } as any

      const result = await resolveLegacyReportRedirect(mockPayload, 'unknown-report')
      expect(result).toBeNull()
    })
  })
})
