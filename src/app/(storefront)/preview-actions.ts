'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PREVIEW_COOKIE } from '@/server/preview'

export async function exitPreview() {
  ;(await cookies()).delete(PREVIEW_COOKIE)
  redirect('/admin/layouts')
}
