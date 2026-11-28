import { NextResponse, type NextRequest } from 'next/server'
import { isAdminMode } from '../(panel)/menu'

// Plain link toggle like the language switch: remember Simple/Pro, go back to the page.
export const GET = (req: NextRequest) => {
  const to = req.nextUrl.searchParams.get('to')
  const back = req.nextUrl.searchParams.get('back') ?? '/admin'
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: back.startsWith('/') && !back.startsWith('//') ? back : '/admin' },
  })
  if (isAdminMode(to))
    res.cookies.set('admin-mode', to, { path: '/admin', maxAge: 31536000, sameSite: 'lax' })
  return res
}
