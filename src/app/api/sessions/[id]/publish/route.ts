import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { publishSession } from '@/lib/data/sessions'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: sessionId } = await params

  try {
    const body = await req.json()
    const changeNote = body?.changeNote

    if (!changeNote || typeof changeNote !== 'string' || !changeNote.trim()) {
      return NextResponse.json(
        { error: 'A change note is required to publish this session' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })
    const published = await publishSession(payload, sessionId, changeNote.trim())

    return NextResponse.json({
      success: true,
      session: published,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to publish session' },
      { status: 400 },
    )
  }
}
