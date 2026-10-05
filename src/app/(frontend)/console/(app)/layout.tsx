import * as React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ConsoleHeader } from '@/components/console/header'
import { BottomNav } from '@/components/console/bottom-nav'

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    redirect('/console/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary overflow-x-hidden">
      <ConsoleHeader />
      <main className="flex-1 pb-20 md:pb-6 px-4 py-4 max-w-6xl w-full mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
