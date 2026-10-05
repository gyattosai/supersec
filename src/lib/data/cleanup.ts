import type { Payload } from 'payload'

export interface StorageClientLike {
  deleteFile: (bucketId: string, fileId: string) => Promise<any>
}

export interface PurgeExpiredProofsOptions {
  storageClient?: StorageClientLike
  bucketId?: string
  retentionDays?: number
}

export interface PurgeExpiredProofsResult {
  purgedProofsCount: number
  expiredRequestsCount: number
  failedDeletionsCount: number
}

export async function purgeExpiredProofs(
  payload: Payload,
  options: PurgeExpiredProofsOptions = {},
): Promise<PurgeExpiredProofsResult> {
  const { storageClient, bucketId = 'proofs', retentionDays = 30 } = options
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

  let purgedProofsCount = 0
  let expiredRequestsCount = 0
  let failedDeletionsCount = 0

  const res = await payload.find({
    collection: 'requests',
    where: {
      createdAt: {
        less_than: cutoff,
      },
    },
    limit: 1000,
    overrideAccess: true,
  })

  for (const doc of res.docs as any[]) {
    let shouldUpdate = false
    const updateData: Record<string, any> = {}

    // 1. Purge physical file from Appwrite Storage
    if (doc.proofStorageId) {
      if (storageClient) {
        try {
          await storageClient.deleteFile(bucketId, doc.proofStorageId)
          purgedProofsCount++
        } catch {
          failedDeletionsCount++
        }
      }
      updateData.proofStorageId = null
      updateData.proofUrl = null
      shouldUpdate = true
    }

    // 2. Mark pending requests expired
    if (doc.status === 'pending') {
      updateData.status = 'expired'
      expiredRequestsCount++
      shouldUpdate = true
    }

    if (shouldUpdate) {
      await payload.update({
        collection: 'requests',
        id: doc.id,
        data: updateData,
        overrideAccess: true,
      })
    }
  }

  return {
    purgedProofsCount,
    expiredRequestsCount,
    failedDeletionsCount,
  }
}
