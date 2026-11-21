import { describe, expect, it } from 'vitest'
import { normalizeHost, resolveStore, type StoreDirectory, type TenantStore } from './tenant'

const stores: Record<string, TenantStore> = {
  main: { id: '1', slug: 'main', active: true },
  shop: { id: '2', slug: 'shop', active: true },
  closed: { id: '3', slug: 'closed', active: false },
}
const hosts: Record<string, string> = { 'shop.example.com': 'shop', 'closed.example.com': 'closed' }
const dir: StoreDirectory = {
  findByHost: async (h) => stores[hosts[h] ?? ''] ?? null,
  findBySlug: async (s) => stores[s] ?? null,
}

describe('normalizeHost', () => {
  it('lowercases and strips port and trailing dot', () => {
    expect(normalizeHost(' Shop.Example.com.:3000 ')).toBe('shop.example.com')
  })
  it('treats a missing host as empty', () => {
    expect(normalizeHost(null)).toBe('')
  })
})

describe('resolveStore', () => {
  const multi = { mode: 'multi', defaultSlug: 'main' } as const
  it('single mode always serves the default store', async () => {
    expect(
      await resolveStore('shop.example.com', { mode: 'single', defaultSlug: 'main' }, dir),
    ).toBe(stores.main)
  })
  it('multi mode resolves the store by host', async () => {
    expect(await resolveStore('SHOP.example.com:443', multi, dir)).toBe(stores.shop)
  })
  it('multi mode falls back to the default store for unknown hosts', async () => {
    expect(await resolveStore('unknown.test', multi, dir)).toBe(stores.main)
  })
  it('an inactive store is not served (no fallback)', async () => {
    expect(await resolveStore('closed.example.com', multi, dir)).toBeNull()
  })
  it('returns null when the default store does not exist', async () => {
    expect(await resolveStore('x', { mode: 'single', defaultSlug: 'none' }, dir)).toBeNull()
  })
})
