import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { purgeExpiredProofs } from '@/lib/data/cleanup'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config })
    const stats = await purgeExpiredProofs(payload)

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
