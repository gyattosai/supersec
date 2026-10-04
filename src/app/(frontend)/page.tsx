import Link from 'next/link'
import React from 'react'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-canvas text-text-primary">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface-1 p-8 text-center shadow-2">
        <div className="mb-4 inline-flex items-center justify-center rounded-md bg-brand-tint px-3 py-1 text-xs font-medium text-brand-text">
          SuperSec v2 · Stage 0
        </div>
        <h1 className="text-display font-medium tracking-tight text-text-primary mb-2">
          SuperSec
        </h1>
        <p className="text-small text-text-secondary mb-6">
          Phone-first class secretary console and classmate portal.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/admin"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-small font-medium text-on-brand transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Open Secretary Console (/admin)
          </Link>
          <a
            href="https://github.com/users/gyattosai/projects/2/views/1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface-2 px-4 text-small font-medium text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
          >
            GitHub Project Board
          </a>
        </div>
      </div>
    </main>
  )
}
