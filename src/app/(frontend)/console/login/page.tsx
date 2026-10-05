'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect') || '/console/dashboard'

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data.errors?.[0]?.message || 'Invalid email or password'
        setError(msg)
        return
      }

      router.push(redirectTarget)
      router.refresh()
    } catch {
      setError('Connection failed. Please check your network and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-surface-1 p-6 shadow-2">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center rounded-md bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-text mb-2">
          SuperSec Console
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          Secretary Sign In
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Access live class roll calls and management tools
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-xs font-medium text-text-secondary select-none"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="secretary@example.com"
            className="h-11 min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium text-text-secondary select-none"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <Button
          type="submit"
          loading={loading}
          variant="primary"
          className="mt-2 w-full font-medium"
        >
          Sign In to Console
        </Button>
      </form>
    </div>
  )
}

export default function ConsoleLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-canvas text-text-primary">
      <React.Suspense
        fallback={
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface-1 p-6 text-center text-xs text-text-tertiary">
            Loading...
          </div>
        }
      >
        <LoginForm />
      </React.Suspense>
    </main>
  )
}
