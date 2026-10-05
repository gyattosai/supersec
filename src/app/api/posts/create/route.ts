import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { slugifyPostTitle } from '@/lib/posts/lifecycle'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      type,
      subjectId,
      title,
      content,
      priority,
      pinnedUntil,
      url,
      category,
      attachments,
      official,
      tags,
      status = 'draft',
      changeNote,
    } = body

    if (!type || !subjectId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: type, subjectId, and title are required.' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })
    const slug = slugifyPostTitle(title)

    let created: any = null

    if (type === 'announcement') {
      created = await payload.create({
        collection: 'announcements',
        data: {
          title,
          slug,
          body: content,
          priority: Boolean(priority),
          pinnedUntil: pinnedUntil ? pinnedUntil.trim() : undefined,
          subjects: [subjectId],
          changeNote: changeNote || 'Initial draft',
          _status: status as any,
          publishedAt: status === 'published' ? new Date().toISOString() : undefined,
        },
        overrideAccess: true,
      })
    } else if (type === 'resource') {
      created = await payload.create({
        collection: 'resources',
        data: {
          title,
          slug,
          url: url ? url.trim() : undefined,
          category: category ? category.trim() : undefined,
          attachments: Array.isArray(attachments) ? attachments : [],
          body: content,
          subjects: [subjectId],
          changeNote: changeNote || 'Initial draft',
          _status: status as any,
          publishedAt: status === 'published' ? new Date().toISOString() : undefined,
        },
        overrideAccess: true,
      })
    } else if (type === 'question') {
      created = await payload.create({
        collection: 'questions',
        data: {
          question: title,
          slug,
          answer: content,
          official: Boolean(official),
          tags: Array.isArray(tags) ? tags : [],
          subjects: [subjectId],
          changeNote: changeNote || 'Initial draft',
          _status: status as any,
          publishedAt: status === 'published' ? new Date().toISOString() : undefined,
        },
        overrideAccess: true,
      })
    } else {
      return NextResponse.json(
        { error: `Unknown post type: ${type}` },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      post: created,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to create post.' },
      { status: 500 },
    )
  }
}
