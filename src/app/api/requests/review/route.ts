import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { reviewRequest } from '@/lib/data/requests'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { requestId, decision, note } = body

    if (!requestId || !decision) {
      return NextResponse.json(
        { error: 'Missing required fields: requestId, decision' },
        { status: 400 },
      )
    }

    if (decision !== 'approved' && decision !== 'declined') {
      return NextResponse.json(
        { error: 'Invalid decision: must be approved or declined' },
        { status: 400 },
      )
    }

    const updated = await reviewRequest(payload, {
      requestId,
      decision,
    })

    return NextResponse.json({
      success: true,
      request: updated,
    })
  } catch (error: any) {
    const msg = error?.message || 'Failed to review request'
    const status = msg.includes('Rule R3') ? 409 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
