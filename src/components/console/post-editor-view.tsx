'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Save, Send, Pin, ExternalLink, HelpCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublishPostModal } from '@/components/console/publish-post-modal'

interface PostEditorViewProps {
  subjectId: string
  subjectCode: string
  subjectName: string
  initialType?: 'announcement' | 'resource' | 'question'
}

export function PostEditorView({
  subjectId,
  subjectCode,
  subjectName,
  initialType = 'announcement',
}: PostEditorViewProps) {
  const router = useRouter()

  const [type, setType] = useState<'announcement' | 'resource' | 'question'>(initialType)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [savingDraft, setSavingDraft] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Announcement fields
  const [priority, setPriority] = useState(false)
  const [pinnedUntil, setPinnedUntil] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d)
  })

  // Resource fields
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('')

  // Question fields
  const [official, setOfficial] = useState(true)
  const [tagsInput, setTagsInput] = useState('')

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError(`Please enter a ${type === 'question' ? 'question' : 'title'}.`)
      return
    }

    setError(null)
    setSavingDraft(true)

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subjectId,
          title: title.trim(),
          content: content.trim(),
          priority,
          pinnedUntil: priority ? pinnedUntil : undefined,
          url: url.trim() || undefined,
          category: category.trim() || undefined,
          official,
          tags,
          status: 'draft',
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save draft')
      }

      router.push(`/console/subjects/${subjectId}?tab=posts`)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Error saving draft')
    } finally {
      setSavingDraft(false)
    }
  }

  const handlePublishConfirm = async (changeNote: string) => {
    if (!title.trim()) {
      setError(`Please enter a ${type === 'question' ? 'question' : 'title'}.`)
      return
    }

    setPublishing(true)
    setError(null)

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      // Create and publish in one atomic step
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subjectId,
          title: title.trim(),
          content: content.trim(),
          priority,
          pinnedUntil: priority ? pinnedUntil : undefined,
          url: url.trim() || undefined,
          category: category.trim() || undefined,
          official,
          tags,
          status: 'published',
          changeNote,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to publish post')
      }

      router.push(`/console/subjects/${subjectId}?tab=posts`)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Error publishing post')
      throw err
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-16">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href={`/console/subjects/${subjectId}?tab=posts`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors py-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {subjectCode} Posts
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-text-primary">Create Post</h1>
        <p className="text-xs text-text-secondary">
          Publish knowledge, announcements, or resources for{' '}
          <span className="font-semibold text-text-primary">{subjectName}</span> ({subjectCode})
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Post Type Selector */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-xl border border-border bg-surface-1">
        {(
          [
            { id: 'announcement', label: 'Announcement', icon: Pin },
            { id: 'resource', label: 'Resource', icon: ExternalLink },
            { id: 'question', label: 'Q&A', icon: HelpCircle },
          ] as const
        ).map((t) => {
          const Icon = t.icon
          const isSelected = type === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setType(t.id)
                if (error) setError(null)
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
                isSelected
                  ? 'bg-surface-3 text-text-primary font-semibold shadow-sm border border-border'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Post Form */}
      <div className="flex flex-col gap-4 p-5 rounded-xl border border-border bg-surface-1 shadow-sm">
        {/* Title or Question */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">
            {type === 'question' ? 'Question' : 'Title'} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (error) setError(null)
            }}
            placeholder={
              type === 'announcement'
                ? 'e.g. Midterm Exam Schedule and Guidelines'
                : type === 'resource'
                  ? 'e.g. Chapter 4 Lecture Slides & Handout'
                  : 'e.g. Is attendance mandatory for online lab meetings?'
            }
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface-2 text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        {/* Announcement Contextual Fields */}
        {type === 'announcement' && (
          <div className="p-3.5 rounded-lg border border-border bg-surface-2 flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={priority}
                onChange={(e) => setPriority(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-brand"
              />
              <span className="text-xs font-medium text-text-primary">
                Pin to top of feed (Priority)
              </span>
            </label>

            {priority && (
              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-1">
                  Pinned until date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={pinnedUntil}
                  onChange={(e) => setPinnedUntil(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-1 text-text-primary focus:outline-none focus:border-brand"
                />
              </div>
            )}
          </div>
        )}

        {/* Resource Contextual Fields */}
        {type === 'resource' && (
          <div className="p-3.5 rounded-lg border border-border bg-surface-2 flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">
                Resource Link (Google Drive, Notion, Slides)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-1 text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Syllabus, Slides, Handouts, Problem Sets"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-1 text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        )}

        {/* Question Contextual Fields */}
        {type === 'question' && (
          <div className="p-3.5 rounded-lg border border-border bg-surface-2 flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={official}
                onChange={(e) => setOfficial(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-brand"
              />
              <span className="text-xs font-medium text-text-primary">
                Mark as Official Answer (Verified by professor/admin)
              </span>
            </label>

            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="attendance, exam, grading, deadline"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-1 text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        )}

        {/* Content Body */}
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">
            {type === 'question' ? 'Authoritative Answer' : 'Content Details'}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              type === 'question'
                ? 'Provide the detailed answer to this question...'
                : 'Write your post message or instructions here...'
            }
            rows={6}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface-2 text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand transition-colors resize-y min-h-[120px]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            loading={savingDraft}
            onClick={handleSaveDraft}
            className="text-xs min-h-[44px] px-4"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save Draft
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => {
              if (!title.trim()) {
                setError(`Please enter a ${type === 'question' ? 'question' : 'title'}.`)
                return
              }
              setPublishModalOpen(true)
            }}
            className="text-xs min-h-[44px] px-5 font-semibold bg-brand hover:bg-brand-hover text-white"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Publish...
          </Button>
        </div>
      </div>

      {/* Publish Modal with Change Note */}
      <PublishPostModal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onConfirm={handlePublishConfirm}
        title={`Publish ${type === 'question' ? 'Q&A' : type === 'resource' ? 'Resource' : 'Announcement'}`}
        loading={publishing}
      />
    </div>
  )
}
