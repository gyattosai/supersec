import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { validatePublishInput } from '@/lib/posts/lifecycle'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { postId, type, changeNote, priority, pinnedUntil } = body

    if (!postId || !type) {
      return NextResponse.json(
        { error: 'Missing postId or type' },
        { status: 400 },
      )
    }

    const todayDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
    }).format(new Date())

    const validation = validatePublishInput({
      changeNote,
      priority,
      pinnedUntil,
      todayDate,
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid publish data' },
        { status: 400 },
      )
    }

    const collectionMap: Record<string, 'announcements' | 'resources' | 'questions'> = {
      announcement: 'announcements',
      resource: 'resources',
      question: 'questions',
    }

    const collection = collectionMap[type]
    if (!collection) {
      return NextResponse.json(
        { error: `Unknown post type: ${type}` },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })
    const nowISO = new Date().toISOString()

    const updatePayload: Record<string, any> = {
      changeNote: changeNote.trim(),
      _status: 'published',
      publishedAt: nowISO,
    }

    if (type === 'announcement') {
      if (typeof priority === 'boolean') updatePayload.priority = priority
      if (pinnedUntil) updatePayload.pinnedUntil = pinnedUntil.trim()
    }

    const updated = await payload.update({
      collection,
      id: postId,
      data: updatePayload,
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      post: updated,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to publish post' },
      { status: 500 },
    )
  }
}
