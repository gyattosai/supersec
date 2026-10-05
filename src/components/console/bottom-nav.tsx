'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Inbox, Settings } from 'lucide-react'
import { getNavigationTabs } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const ICON_MAP = {
  dashboard: LayoutDashboard,
  subjects: BookOpen,
  requests: Inbox,
  settings: Settings,
}

export function BottomNav() {
  const pathname = usePathname()
  const tabs = getNavigationTabs(pathname)

  return (
    <nav
      aria-label="Secretary navigation"
      className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-surface-1/95 backdrop-blur md:hidden"
    >
      <div className="flex h-full items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = ICON_MAP[tab.id]
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] py-1 text-[11px] font-medium transition-colors select-none',
                tab.isActive
                  ? 'text-brand-text font-semibold'
                  : 'text-text-tertiary hover:text-text-secondary active:text-text-primary',
              )}
            >
              <Icon className={cn('h-5 w-5 mb-0.5', tab.isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]')} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
