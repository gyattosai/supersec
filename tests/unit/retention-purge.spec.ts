import { describe, expect, it, vi } from 'vitest'
import { purgeExpiredProofs } from '@/lib/data/cleanup'

describe('Automated 30-Day Retention Purge (Stage 1.10 / Issue #11 - Rule R4 & ADR 0008)', () => {
  it('purges files from storage and removes proof metadata for requests older than 30 days', async () => {
    const olderThan30Days = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()

    const mockDocs = [
      {
        id: 'req-old-with-proof',
        createdAt: olderThan30Days,
        status: 'approved',
        proofStorageId: 'file-123',
        proofUrl: 'https://cloud.appwrite.io/storage/buckets/proofs/files/file-123/view',
      },
      {
        id: 'req-old-pending',
        createdAt: olderThan30Days,
        status: 'pending',
        proofStorageId: null,
        proofUrl: null,
      },
      {
        id: 'req-recent',
        createdAt: recentDate,
        status: 'pending',
        proofStorageId: 'file-456',
        proofUrl: 'https://cloud.appwrite.io/storage/buckets/proofs/files/file-456/view',
      },
    ]

    const updatedMap = new Map<string, any>()
    const mockStorageClient = {
      deleteFile: vi.fn().mockResolvedValue(true),
    }

    const mockPayload = {
      find: async ({ collection, where }: any) => {
        if (collection === 'requests') {
          // Filter docs where createdAt < cutoff
          const cutoff = where?.createdAt?.less_than
          const filtered = mockDocs.filter((d) => (cutoff ? d.createdAt < cutoff : true))
          return { docs: filtered }
        }
        return { docs: [] }
      },
      update: async ({ collection, id, data }: any) => {
        if (collection === 'requests') {
          updatedMap.set(id, data)
          return { id, ...data }
        }
      },
    }

    const stats = await purgeExpiredProofs(mockPayload as any, {
      storageClient: mockStorageClient,
      bucketId: 'proofs',
      retentionDays: 30,
    })

    // Assert file was purged from Appwrite Storage
    expect(mockStorageClient.deleteFile).toHaveBeenCalledWith('proofs', 'file-123')
    expect(mockStorageClient.deleteFile).not.toHaveBeenCalledWith('proofs', 'file-456')

    // Assert metadata was cleared for req-old-with-proof
    const oldProofUpdate = updatedMap.get('req-old-with-proof')
    expect(oldProofUpdate.proofStorageId).toBeNull()
    expect(oldProofUpdate.proofUrl).toBeNull()

    // Assert status was marked expired for old pending request
    const oldPendingUpdate = updatedMap.get('req-old-pending')
    expect(oldPendingUpdate.status).toBe('expired')

    // Assert recent document was untouched
    expect(updatedMap.has('req-recent')).toBe(false)

    // Assert summary statistics
    expect(stats.purgedProofsCount).toBe(1)
    expect(stats.expiredRequestsCount).toBe(1)
  })

  it('handles storage client failures gracefully without aborting the purge loop', async () => {
    const olderThan30Days = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
    const mockDocs = [
      {
        id: 'req-fail-storage',
        createdAt: olderThan30Days,
        status: 'approved',
        proofStorageId: 'file-deleted-upstream',
        proofUrl: 'https://...',
      },
      {
        id: 'req-success-pending',
        createdAt: olderThan30Days,
        status: 'pending',
      },
    ]

    const updatedMap = new Map<string, any>()
    const mockStorageClient = {
      deleteFile: vi.fn().mockRejectedValue(new Error('Storage file not found (404)')),
    }

    const mockPayload = {
      find: async () => ({ docs: mockDocs }),
      update: async ({ id, data }: any) => {
        updatedMap.set(id, data)
        return { id, ...data }
      },
    }

    const stats = await purgeExpiredProofs(mockPayload as any, {
      storageClient: mockStorageClient,
      bucketId: 'proofs',
    })

    expect(stats.failedDeletionsCount).toBe(1)
    expect(stats.expiredRequestsCount).toBe(1)
    // Metadata is still cleared so we don't try to purge ghost files forever
    expect(updatedMap.get('req-fail-storage').proofStorageId).toBeNull()
  })
})
