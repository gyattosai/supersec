'use client'

import React, { useState } from 'react'
import {
  Pin,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  Calendar,
  FileText,
  FileDown,
  Megaphone,
  BookOpen,
} from 'lucide-react'
import type { PublicPostsHub } from '@/lib/posts/public-projection'
import { Badge } from '@/components/ui/badge'

interface PublicPostsViewProps {
  postsHub: PublicPostsHub
}

export function PublicPostsView({ postsHub }: PublicPostsViewProps) {
  const [activeTab, setActiveTab] = useState<'announcements' | 'resources' | 'qa'>('announcements')
  const [resourceCategory, setResourceCategory] = useState<string>('all')

  const { announcements, resources, questions, pinnedAlert } = postsHub

  // Unique categories for filtering resources
  const categories = Array.from(
    new Set(resources.map((r) => r.category).filter(Boolean) as string[]),
  )

  const filteredResources =
    resourceCategory === 'all'
      ? resources
      : resources.filter((r) => r.category === resourceCategory)

  return (
    <div className="flex flex-col gap-5">
      {/* Top Pinned Priority Announcement Alert */}
      {pinnedAlert && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Pin className="h-3 w-3" />
              Pinned Notice
            </span>
            {pinnedAlert.pinnedUntil && (
              <span className="text-[11px] text-amber-300/80">
                Until {pinnedAlert.pinnedUntil}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-amber-100">{pinnedAlert.title}</h3>
          {pinnedAlert.content && (
            <p className="text-xs text-amber-200/90 whitespace-pre-wrap leading-relaxed">
              {pinnedAlert.content}
            </p>
          )}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[44px] ${
            activeTab === 'announcements'
              ? 'bg-brand/15 text-brand-text border border-brand/30'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
          }`}
        >
          <Megaphone className="h-3.5 w-3.5" />
          <span>Announcements</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-3 text-text-tertiary">
            {announcements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[44px] ${
            activeTab === 'resources'
              ? 'bg-brand/15 text-brand-text border border-brand/30'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Resources</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-3 text-text-tertiary">
            {resources.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qa')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[44px] ${
            activeTab === 'qa'
              ? 'bg-brand/15 text-brand-text border border-brand/30'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Q&A</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-3 text-text-tertiary">
            {questions.length}
          </span>
        </button>
      </div>

      {/* Tab Panels */}

      {/* 1. Announcements */}
      {activeTab === 'announcements' && (
        <div className="flex flex-col gap-3">
          {announcements.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-surface-1/40">
              <Megaphone className="h-8 w-8 text-text-quaternary mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-text-tertiary">No announcements posted yet.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 sm:p-5 rounded-2xl border border-border bg-surface-1 flex flex-col gap-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ann.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </span>
                    )}
                    <span className="text-xs font-semibold text-text-primary">{ann.title}</span>
                  </div>
                  {ann.publishedAt && (
                    <span className="text-[11px] text-text-quaternary shrink-0">
                      {new Date(ann.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                {ann.content && (
                  <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                    {ann.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. Resources */}
      {activeTab === 'resources' && (
        <div className="flex flex-col gap-3">
          {/* Category Filter Chips */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setResourceCategory('all')}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors min-h-[32px] ${
                  resourceCategory === 'all'
                    ? 'bg-brand text-white'
                    : 'bg-surface-2 text-text-secondary hover:text-text-primary'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setResourceCategory(cat)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors min-h-[32px] ${
                    resourceCategory === cat
                      ? 'bg-brand text-white'
                      : 'bg-surface-2 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filteredResources.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-surface-1/40">
              <BookOpen className="h-8 w-8 text-text-quaternary mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-text-tertiary">No resources shared yet.</p>
            </div>
          ) : (
            filteredResources.map((res) => (
              <div
                key={res.id}
                className="p-4 sm:p-5 rounded-2xl border border-border bg-surface-1 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {res.category && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-3 text-text-secondary border border-border">
                          {res.category}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-text-primary">{res.title}</span>
                    </div>
                    {res.content && (
                      <p className="text-xs text-text-secondary leading-relaxed mt-1">
                        {res.content}
                      </p>
                    )}
                  </div>

                  {res.url && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 text-brand-text hover:bg-brand/20 border border-brand/20 text-xs font-medium shrink-0 min-h-[44px]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Link</span>
                    </a>
                  )}
                </div>

                {res.attachmentsCount && res.attachmentsCount > 0 ? (
                  <div className="flex items-center gap-1 text-[11px] text-text-tertiary pt-2 border-t border-border/60">
                    <FileDown className="h-3.5 w-3.5" />
                    <span>{res.attachmentsCount} file attachment(s) available</span>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. Questions (Q&A) */}
      {activeTab === 'qa' && (
        <div className="flex flex-col gap-3">
          {questions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-surface-1/40">
              <HelpCircle className="h-8 w-8 text-text-quaternary mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-text-tertiary">No Q&A published yet.</p>
            </div>
          ) : (
            questions.map((q) => (
              <div
                key={q.id}
                className="p-4 sm:p-5 rounded-2xl border border-border bg-surface-1 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {q.official && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" />
                        Official Answer
                      </span>
                    )}
                    <h4 className="text-xs font-semibold text-text-primary">{q.question}</h4>
                  </div>
                </div>

                {q.answer && (
                  <div className="rounded-xl border border-border/80 bg-surface-2/60 p-3 text-xs text-text-secondary leading-relaxed">
                    {q.answer}
                  </div>
                )}

                {q.tags && q.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {q.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-3 text-text-tertiary"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
