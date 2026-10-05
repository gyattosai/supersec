import type { Metadata } from 'next'
import React from 'react'
import './globals.css'

import { cookies } from 'next/headers'

export const metadata: Metadata = {
  title: 'SuperSec',
  description: 'Class secretary management system',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const theme = cookieStore.get('supersec-theme')?.value || 'dark'
  const isLight = theme === 'light'

  return (
    <html lang="en" data-theme={isLight ? 'light' : 'dark'} className={isLight ? 'light' : 'dark'}>
      <body className="min-h-screen bg-canvas text-text-primary antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
