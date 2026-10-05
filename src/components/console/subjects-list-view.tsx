'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Search,
  Clock,
  Play,
  ExternalLink,
  AlertTriangle,
  Users,
  Archive,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTimeRange12 } from '@/lib/format-time'

export interface SubjectListItem {
  id: string
  code: string
  name: string
  sectionMark?: string
  professor?: string
  slug: string
  schedule: Array<{ weekday: string; start: string; end: string }>
  studentCount: number
  flaggedCount?: number
  archivedAt?: string | null
}

export interface SubjectsListViewProps {
  subjects: SubjectListItem[]
  activeTermName?: string
  todayDate: string
}

export function SubjectsListView({
  subjects,
  activeTermName,
  todayDate,
}: SubjectsListViewProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState('')
  const [filter, setFilter] = React.useState<'active' | 'archived'>('active')
  const [startingSubjectId, setStartingSubjectId] = React.useState<string | null>(null)

  const handleStartSession = async (subj: SubjectListItem) => {
    try {
      setStartingSubjectId(subj.id)
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: subj.id,
          date: todayDate,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to start session')
      }

      const data = await res.json()
      router.push(`/console/session/${data.session.id}`)
    } catch (err: any) {
      alert(err?.message || 'Error starting session')
    } finally {
      setStartingSubjectId(null)
    }
  }

  const filteredSubjects = subjects.filter((s) => {
    const isArchived = Boolean(s.archivedAt)
    if (filter === 'active' && isArchived) return false
    if (filter === 'archived' && !isArchived) return false

    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.professor && s.professor.toLowerCase().includes(q)) ||
      (s.sectionMark && s.sectionMark.toLowerCase().includes(q))
    )
  })

  const activeCount = subjects.filter((s) => !s.archivedAt).length
  const archivedCount = subjects.filter((s) => Boolean(s.archivedAt)).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Subjects
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {activeTermName ? `${activeTermName} · ` : ''}Manage classes, attendance roster & reports
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-1 border border-border w-fit">
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
              filter === 'active'
                ? 'bg-surface-3 text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('archived')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
              filter === 'archived'
                ? 'bg-surface-3 text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Archived ({archivedCount})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects or prof..."
            className="w-full h-10 min-h-[44px] sm:min-h-[40px] pl-9 pr-3 rounded-xl border border-border bg-surface-1 text-xs text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Subjects Grid (Adaptive 1 col on mobile, 2 col on tablet, 3 col on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.map((subj) => (
          <div
            key={subj.id}
            className="p-4 sm:p-5 rounded-2xl border border-border bg-surface-1 shadow-xs flex flex-col justify-between gap-4 hover:border-border-strong transition-all duration-150"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-brand-text tracking-wide uppercase px-2 py-0.5 rounded bg-brand/10 border border-brand/20">
                  {subj.code} {subj.sectionMark ? `· ${subj.sectionMark}` : ''}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {subj.flaggedCount && subj.flaggedCount > 0 ? (
                    <Link
                      href={`/console/subjects/${subj.id}?tab=monitoring`}
                      className="inline-flex items-center"
                    >
                      <Badge variant="danger" className="text-[11px] gap-1 hover:opacity-80 transition-opacity">
                        <AlertTriangle className="h-3 w-3" />
                        {subj.flaggedCount} flagged
                      </Badge>
                    </Link>
                  ) : null}
                  <Badge variant="neutral" className="text-[11px]">
                    {subj.studentCount} student{subj.studentCount === 1 ? '' : 's'}
                  </Badge>
                </div>
              </div>

              <Link
                href={`/console/subjects/${subj.id}`}
                className="group block hover:opacity-90 transition-opacity mt-1"
              >
                <h2 className="text-base font-semibold text-text-primary group-hover:text-brand transition-colors flex items-center justify-between">
                  <span className="leading-snug">{subj.name}</span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-brand shrink-0 ml-1" />
                </h2>
              </Link>

              {subj.professor && (
                <p className="text-xs text-text-tertiary mt-1">
                  Prof. {subj.professor}
                </p>
              )}

              {/* 12-Hour Schedule Badges */}
              <div className="flex flex-wrap gap-1.5 mt-3.5">
                {subj.schedule.map((slot, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-2 text-text-secondary border border-border"
                  >
                    <Clock className="h-3 w-3 text-text-tertiary shrink-0" />
                    <span className="capitalize font-semibold">{slot.weekday}</span>
                    <span>{formatTimeRange12(slot.start, slot.end)}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-border/60">
              <Link
                href={`/console/subjects/${subj.id}`}
                className="inline-flex items-center justify-center min-h-[42px] px-3.5 rounded-xl border border-border bg-surface-2 text-xs font-semibold text-text-primary hover:bg-surface-3 transition-colors flex-1"
              >
                Open Subject
              </Link>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleStartSession(subj)}
                loading={startingSubjectId === subj.id}
                className="min-h-[42px] text-xs font-semibold px-3"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Start Session
              </Button>
              <Link
                href={`/s/${subj.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center min-h-[42px] min-w-[42px] px-2.5 rounded-xl border border-border bg-surface-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors shrink-0"
                title="Open public classmate view"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface-1 p-8 text-center shadow-1">
          <BookOpen className="h-8 w-8 text-text-quaternary mx-auto mb-2" />
          <p className="text-sm font-semibold text-text-primary">
            No {filter} subjects found
          </p>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            {search
              ? `No subjects match your search for "${search}".`
              : `You have no ${filter} subjects in the current term.`}
          </p>
        </div>
      )}
    </div>
  )
}
