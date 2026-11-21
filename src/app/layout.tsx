import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { currentLocale } from '@/server/request'
import { fontVariables } from '@/themes/fonts'
import './globals.css'

// Store is resolved per request from the Host header (multi-tenant), so nothing is prerendered.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Root Logic Commerce' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={await currentLocale()} className={fontVariables}>
      <body>{children}</body>
    </html>
  )
}
