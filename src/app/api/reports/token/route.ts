import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import {
  getActiveReportLink,
  createReportLink,
  resetReportLink,
} from '@/lib/data/reports'

export async function GET(req: Request) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get('subjectId')

    if (!subjectId) {
      return NextResponse.json(
        { error: 'subjectId query parameter is required' },
        { status: 400 },
      )
    }

    let link = await getActiveReportLink(payload, subjectId)
    if (!link) {
      link = await createReportLink(payload, {
        subjectId,
        createdBy: typeof user.id === 'string' ? user.id : String(user.id),
      })
    }

    return NextResponse.json({
      success: true,
      token: link.token,
      linkId: link.id,
      createdAt: link.createdAt,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch report token' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { subjectId } = body

    if (!subjectId) {
      return NextResponse.json(
        { error: 'subjectId is required in request body' },
        { status: 400 },
      )
    }

    const newLink = await resetReportLink(
      payload,
      subjectId,
      typeof user.id === 'string' ? user.id : String(user.id),
    )

    return NextResponse.json({
      success: true,
      token: newLink.token,
      linkId: newLink.id,
      createdAt: newLink.createdAt,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to reset report token' },
      { status: 500 },
    )
  }
}
