import { beforeEach, describe, expect, it, vi } from 'vitest'

const req = vi.hoisted(() => ({ host: 'shop.test', lang: undefined as string | undefined }))
const rt = vi.hoisted(() => ({
  config: {
    storeMode: 'multi',
    defaultStoreSlug: 'shop',
    store: { locale: 'bn', name: 'Shop', theme: 'minimal' },
  },
  container: {
    stores: { findByHost: vi.fn(), findBySlug: vi.fn() },
    settings: { get: vi.fn() },
  },
  auth: { api: { getSession: vi.fn() } },
}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: req.host }),
  cookies: async () => ({ get: () => (req.lang ? { value: req.lang } : undefined) }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))
vi.mock('./runtime', () => ({ runtime: async () => rt }))

const { currentActor, currentLocale, currentSettings, currentStore } = await import('./request')
const store = { id: 's1', slug: 'shop', active: true }

beforeEach(() => {
  vi.clearAllMocks()
  req.lang = undefined
})

describe('request helpers', () => {
  it('resolves the store from the Host header, or 404s', async () => {
    rt.container.stores.findByHost.mockResolvedValueOnce(store)
    expect(await currentStore()).toBe(store)
    rt.container.stores.findByHost.mockResolvedValueOnce(null)
    rt.container.stores.findBySlug.mockResolvedValueOnce(null)
    await expect(currentStore()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('reads the signed-in actor; SUPER_ADMIN has no store', async () => {
    rt.auth.api.getSession.mockResolvedValueOnce(null)
    expect(await currentActor()).toBeNull()
    rt.auth.api.getSession.mockResolvedValueOnce({
      user: { id: 'u', role: 'OWNER', storeId: 's1' },
    })
    expect(await currentActor()).toEqual({ id: 'u', role: 'OWNER', storeId: 's1' })
    rt.auth.api.getSession.mockResolvedValueOnce({ user: { id: 'l', role: 'SUPER_ADMIN' } })
    expect(await currentActor()).toEqual({ id: 'l', role: 'SUPER_ADMIN', storeId: null })
  })

  it('takes the language from the cookie, else the store default', async () => {
    expect(await currentLocale()).toBe('bn')
    req.lang = 'en'
    expect(await currentLocale()).toBe('en')
    req.lang = 'fr'
    expect(await currentLocale()).toBe('bn')
  })

  it('seeds settings with the configured theme defaults', async () => {
    rt.container.stores.findByHost.mockResolvedValueOnce(store)
    rt.container.settings.get.mockResolvedValueOnce({ version: 1 })
    expect(await currentSettings()).toEqual({ version: 1 })
    expect(rt.container.settings.get).toHaveBeenCalledWith('s1', {
      storeName: 'Shop',
      design: expect.objectContaining({ brand: { nameFont: 'inter', siteFont: 'inter' } }),
    })
  })
})
