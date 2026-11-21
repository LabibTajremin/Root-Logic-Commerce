import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { isLocale, type Locale } from '@/i18n'
import type { Actor, Role } from '@/modules/access'
import { runtime } from './runtime'
import { loadTheme } from '@/themes'
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
  if (isLocale(lang)) return lang
  const [{ business }, { config }] = await Promise.all([currentSettings(), runtime()])
  return business.language.default ?? config.store.locale
})

// Every reader seeds with the same defaults, so whichever page runs first doesn't matter.
export const currentSettings = cache(async () => {
  const [store, { container, config }] = await Promise.all([currentStore(), runtime()])
  const seed = await loadTheme(config.store.theme)
  return container.settings.get(store.id, { storeName: config.store.name, design: seed.defaults })
})

// Next sets x-forwarded-for itself (from the proxy, else the socket), so it is always there.
export const currentIp = async () =>
  String((await headers()).get('x-forwarded-for'))
    .split(',')[0]!
    .trim()
