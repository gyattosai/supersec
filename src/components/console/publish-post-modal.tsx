'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Send, AlertCircle } from 'lucide-react'

interface PublishPostModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (changeNote: string) => Promise<void>
  title?: string
  loading?: boolean
}

export function PublishPostModal({
  open,
  onClose,
  onConfirm,
  title = 'Publish Post',
  loading = false,
}: PublishPostModalProps) {
  const [changeNote, setChangeNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changeNote.trim()) {
      setError('Please provide a brief change note describing what was updated.')
      return
    }

    setError(null)
    try {
      await onConfirm(changeNote.trim())
      setChangeNote('')
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to publish post.')
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <form onSubmit={handlePublish} className="flex flex-col gap-4 py-2">
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">
            Change Note <span className="text-red-400">*</span>
          </label>
          <p className="text-[11px] text-text-secondary mb-2">
            A concise note describing the updates in this version (visible in post revision history).
          </p>
          <textarea
            value={changeNote}
            onChange={(e) => {
              setChangeNote(e.target.value)
              if (error) setError(null)
            }}
            placeholder="e.g. Updated room number to 402, attached revised syllabus slides"
            rows={3}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface-2 text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand transition-colors resize-none"
            autoFocus
          />
          {error && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="text-xs min-h-[38px] px-3.5"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="text-xs min-h-[38px] px-4 font-semibold bg-brand hover:bg-brand-hover text-white"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Publish Version
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
