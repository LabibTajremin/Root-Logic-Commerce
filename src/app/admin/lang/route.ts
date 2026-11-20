import { NextResponse, type NextRequest } from 'next/server'
import { isLocale } from '@/i18n'

// Plain link toggle (no client JS): remember the choice, go back to the page.
export const GET = (req: NextRequest) => {
  const to = req.nextUrl.searchParams.get('to')
  const back = req.nextUrl.searchParams.get('back') ?? '/admin'
  const res = NextResponse.redirect(new URL(back.startsWith('/') ? back : '/admin', req.url))
  if (isLocale(to)) res.cookies.set('lang', to, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  return res
}
