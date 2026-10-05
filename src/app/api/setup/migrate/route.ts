import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { runV1Migration } from '@/lib/data/migrate-v1'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config })
    const body = await req.json().catch(() => ({}))

    const stats = await runV1Migration(payload, {
      endpoint: body.endpoint || process.env.V1_APPWRITE_ENDPOINT,
      projectId: body.projectId || process.env.V1_APPWRITE_PROJECT_ID,
      apiKey: body.apiKey || process.env.V1_APPWRITE_API_KEY,
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to run v1 migration' },
      { status: 500 },
    )
  }
}
