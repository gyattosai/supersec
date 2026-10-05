import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { purgeExpiredProofs, type StorageClientLike } from '@/lib/data/cleanup'

function getStorageClient(): StorageClientLike | undefined {
  const endpoint = process.env.APPWRITE_ENDPOINT
  const projectId = process.env.APPWRITE_PROJECT_ID
  const apiKey = process.env.APPWRITE_API_KEY

  if (!endpoint || !projectId || !apiKey) {
    return undefined
  }

  return {
    async deleteFile(bucketId: string, fileId: string) {
      const url = `${endpoint.replace(/\/$/, '')}/storage/buckets/${bucketId}/files/${fileId}`
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Appwrite-Project': projectId,
          'X-Appwrite-Key': apiKey,
        },
      })
      if (!res.ok && res.status !== 404) {
        throw new Error(`Appwrite deleteFile failed: ${res.status} ${res.statusText}`)
      }
      return true
    },
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config })
    const stats = await purgeExpiredProofs(payload, {
      storageClient: getStorageClient(),
      bucketId: process.env.APPWRITE_BUCKET_PROOFS || 'proofs',
      retentionDays: 30,
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...stats,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to execute retention purge' },
      { status: 500 },
    )
  }
}
