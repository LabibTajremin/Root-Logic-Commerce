import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

// Store is resolved per request from the Host header (multi-tenant), so nothing is prerendered.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Root Logic Commerce' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
