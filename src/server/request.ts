import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { isLocale, type Locale } from '@/i18n'
import type { Actor, Role } from '@/modules/access'
import { runtime } from './runtime'
import { resolveStore } from './tenant'

export const currentStore = cache(async () => {
  const { container, config } = await runtime()
  const store = await resolveStore(
    (await headers()).get('host'),
    { mode: config.storeMode, defaultSlug: config.defaultStoreSlug },
    container.stores,
  )
  if (!store) notFound()
  return store
})

export const currentActor = cache(async (): Promise<Actor | null> => {
  const { auth } = await runtime()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const u = session.user as { id: string; role: Role; storeId?: string | null }
  return { id: u.id, role: u.role, storeId: u.storeId ?? null }
})

export const currentLocale = cache(async (): Promise<Locale> => {
  const lang = (await cookies()).get('lang')?.value
  return isLocale(lang) ? lang : (await runtime()).config.store.locale
})
