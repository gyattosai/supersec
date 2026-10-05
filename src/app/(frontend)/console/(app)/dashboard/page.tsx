import * as React from 'react'
import Link from 'next/link'
import { BookOpen, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            Dashboard
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Today&apos;s schedule and active roll calls
          </p>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-border bg-surface-1 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-brand-text mb-1">
              <Calendar className="h-4 w-4" />
              <span>Today&apos;s Classes</span>
            </div>
            <p className="text-sm font-medium text-text-primary">
              No active session running right now
            </p>
          </div>
          <Link href="/console/subjects">
            <Button variant="secondary" size="sm" className="w-full">
              View All Subjects
            </Button>
          </Link>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface-1 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-text-tertiary mb-1">
              <BookOpen className="h-4 w-4" />
              <span>Roster & Enrollment</span>
            </div>
            <p className="text-sm font-medium text-text-primary">
              Manage class directories and paste rosters
            </p>
          </div>
          <Link href="/console/subjects">
            <Button variant="outline" size="sm" className="w-full">
              Manage Rosters
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
