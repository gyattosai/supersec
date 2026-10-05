import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { markNoClass } from '@/lib/data/sessions'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { subjectId, date, reason } = body

    if (!subjectId || !date) {
      return NextResponse.json(
        { error: 'subjectId and date are required' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })
    const session = await markNoClass(payload, {
      subjectId,
      date,
      reason,
    })

    return NextResponse.json({
      success: true,
      session,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to mark no class' },
      { status: 400 },
    )
  }
}
