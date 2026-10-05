'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, LayoutDashboard, BookOpen, Inbox, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getNavigationTabs } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const ICON_MAP = {
  dashboard: LayoutDashboard,
  subjects: BookOpen,
  requests: Inbox,
  settings: Settings,
}

export interface ConsoleHeaderProps {
  termName?: string
}

export function ConsoleHeader({ termName }: ConsoleHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const tabs = getNavigationTabs(pathname)
  const [loggingOut, setLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await fetch('/api/users/logout', { method: 'POST' })
      router.push('/console/login')
      router.refresh()
    } catch {
      router.push('/console/login')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-surface-1/95 backdrop-blur px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/console/dashboard" className="flex items-center gap-2">
          <span className="font-semibold text-text-primary text-base tracking-tight">SuperSec</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-tint text-brand-text">
            Console
          </span>
        </Link>
        {termName && (
          <Badge variant="neutral" className="hidden sm:inline-flex text-xs">
            {termName}
          </Badge>
        )}

        {/* Desktop Navigation */}
        <nav aria-label="Desktop navigation" className="hidden md:flex items-center gap-1 ml-4">
          {tabs.map((tab) => {
            const Icon = ICON_MAP[tab.id]
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  tab.isActive
                    ? 'bg-surface-2 text-text-primary font-semibold shadow-xs'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2/60',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', tab.isActive ? 'text-brand-text' : '')} />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
          aria-label="Sign out"
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-ring rounded-md"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
