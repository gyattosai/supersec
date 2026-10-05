'use client'

import * as React from 'react'
import {
  Moon,
  Sun,
  Download,
  Database,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  User,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface SettingsHubProps {
  userEmail: string
  activeTerm: {
    id: string
    name: string
    startDate: string
    endDate: string
  } | null
  stats: {
    subjectsCount: number
    studentsCount: number
    sessionsCount: number
  }
}

export function SettingsHub({ userEmail, activeTerm, stats }: SettingsHubProps) {
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark')
  const [exporting, setExporting] = React.useState(false)
  const [exportSuccess, setExportSuccess] = React.useState(false)

  React.useEffect(() => {
    // Detect theme from html attribute or cookie
    const isLight =
      document.documentElement.classList.contains('light') ||
      document.documentElement.getAttribute('data-theme') === 'light'
    setTheme(isLight ? 'light' : 'dark')
  }, [])

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme)
    // 1. Update HTML classes and attributes immediately
    if (newTheme === 'light') {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    // 2. Persist in cookie (expires in 1 year)
    document.cookie = `supersec-theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      setExportSuccess(false)
      const res = await fetch('/api/settings/export')
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const now = new Date().toISOString().slice(0, 10)
      a.download = `supersec-backup-${now}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 5000)
    } catch (e) {
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Settings & System
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Manage console preferences, academic terms, and disaster recovery backups
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Appearance & Theme */}
        <div className="p-5 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">Appearance</span>
              <Badge variant="neutral">Client Preference</Badge>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              SuperSec defaults to Linear dark aesthetic. Toggle light mode for outdoor mobile legibility.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={cn(
                'min-h-[44px] flex items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-all',
                theme === 'dark'
                  ? 'border-brand bg-brand/15 text-brand-text shadow-sm'
                  : 'border-border bg-surface-2 text-text-tertiary hover:text-text-primary',
              )}
            >
              <Moon className="h-4 w-4" />
              <span>Dark Theme</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={cn(
                'min-h-[44px] flex items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-all',
                theme === 'light'
                  ? 'border-brand bg-brand/15 text-brand-text shadow-sm'
                  : 'border-border bg-surface-2 text-text-tertiary hover:text-text-primary',
              )}
            >
              <Sun className="h-4 w-4" />
              <span>Light Theme</span>
            </button>
          </div>
        </div>

        {/* Card 2: Active Academic Semester */}
        <div className="p-5 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">Academic Term</span>
              <Badge variant="success">Active</Badge>
            </div>
            {activeTerm ? (
              <div className="mt-1 flex flex-col gap-1">
                <span className="text-base font-bold text-text-primary tracking-tight">
                  {activeTerm.name}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary font-mono">
                  <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                  <span>
                    {activeTerm.startDate} → {activeTerm.endDate}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary">No active term configured.</p>
            )}
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Asia/Manila Calendar</span>
            <a
              href="/admin/collections/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-text hover:underline min-h-[44px] px-2"
            >
              <span>Manage in Admin</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Card 3: Disaster Recovery & Full Data Export */}
        <div className="p-5 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">Disaster Recovery</span>
              <Badge variant="neutral">JSON Backup</Badge>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Export complete academic ledger including subjects, student enrollments, session attendance records, and participation tallies.
            </p>
          </div>

          <div className="pt-2 border-t border-border/60 flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleExport}
              disabled={exporting}
              className="w-full gap-2 min-h-[44px]"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  <span>Exporting database...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Export All Data (JSON)</span>
                </>
              )}
            </Button>
            <div className="flex items-center justify-between text-[11px] text-text-quaternary px-1">
              <span>{stats.subjectsCount} Subjects</span>
              <span>{stats.studentsCount} Students</span>
              <span>{stats.sessionsCount} Sessions</span>
            </div>
          </div>
        </div>

        {/* Card 4: Secretary Account & Infrastructure Health */}
        <div className="p-5 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">Secretary Session</span>
              <Badge variant="success">Authenticated</Badge>
            </div>
            <div className="mt-1 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                <User className="h-3.5 w-3.5 text-brand-text" />
                <span className="font-mono">{userEmail}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <Database className="h-3.5 w-3.5" />
                <span>MongoDB Atlas Flex (Connected)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Role: Primary Secretary</span>
            <div className="flex items-center gap-1 text-[11px] text-text-quaternary">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-text" />
              <span>Full Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
