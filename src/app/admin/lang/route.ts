import { NextResponse, type NextRequest } from 'next/server'
import { isLocale } from '@/i18n'

// Plain link toggle (no client JS): remember the choice, go back to the page.
// Relative Location keeps the shopper on the store's own host (multi-domain).
export const GET = (req: NextRequest) => {
  const to = req.nextUrl.searchParams.get('to')
  const back = req.nextUrl.searchParams.get('back') ?? '/admin'
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: back.startsWith('/') && !back.startsWith('//') ? back : '/admin' },
  })
  if (isLocale(to)) res.cookies.set('lang', to, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  return res
}
