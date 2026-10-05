import * as React from 'react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PostEditorView } from '@/components/console/post-editor-view'

interface PageProps {
  searchParams: Promise<{
    type?: string
    subject?: string
  }>
}

export default async function NewPostPage({ searchParams }: PageProps) {
  const { type, subject: subjectId } = await searchParams

  if (!subjectId) {
    notFound()
  }

  const payload = await getPayload({ config })

  let subject: any = null
  try {
    subject = await payload.findByID({
      collection: 'subjects',
      id: subjectId,
      overrideAccess: true,
    })
  } catch {
    const res = await payload.find({
      collection: 'subjects',
      where: { slug: { equals: subjectId } },
      limit: 1,
      overrideAccess: true,
    })
    subject = res.docs[0] || null
  }

  if (!subject) {
    notFound()
  }

  const validTypes = ['announcement', 'resource', 'question'] as const
  const initialType = validTypes.includes(type as any)
    ? (type as 'announcement' | 'resource' | 'question')
    : 'announcement'

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6">
      <PostEditorView
        subjectId={subject.id}
        subjectCode={subject.code}
        subjectName={subject.name}
        initialType={initialType}
      />
    </div>
  )
}
