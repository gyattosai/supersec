import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { markGlobalNoClass } from '@/lib/data/sessions'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { date, reason, termId, subjectIds } = body

    if (!date) {
      return NextResponse.json(
        { error: 'date is required in YYYY-MM-DD format' },
        { status: 400 },
      )
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'A cancellation reason is required' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })
    const result = await markGlobalNoClass(payload, {
      date,
      reason,
      termId,
      subjectIds,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to execute global cancellation' },
      { status: 400 },
    )
  }
}
