import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { applyOpsToEntries, type SessionOp } from '@/lib/roll-call-queue'

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
    const ops = body?.ops as SessionOp[]

    if (!Array.isArray(ops) || ops.length === 0) {
      return NextResponse.json(
        { error: 'Body must include a non-empty ops array' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })

    const sessionRes = await payload.find({
      collection: 'sessions',
      where: { id: { equals: sessionId } },
      limit: 1,
      overrideAccess: true,
    })

    if (!sessionRes.docs || sessionRes.docs.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const session = sessionRes.docs[0] as any
    const updatedEntries = applyOpsToEntries(session.entries || [], ops)

    await payload.update({
      collection: 'sessions',
      id: sessionId,
      data: {
        entries: updatedEntries,
      },
      overrideAccess: true,
    })

    const processedKeys = ops.map((o) => o.idempotencyKey)

    return NextResponse.json({
      success: true,
      processedKeys,
      entries: updatedEntries,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process session operations' },
      { status: 500 },
    )
  }
}
