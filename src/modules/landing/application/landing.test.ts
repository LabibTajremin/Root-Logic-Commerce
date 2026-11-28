import { describe, expect, it } from 'vitest'
import type { LandingData } from '../domain/landing'
import { createLanding } from './landing'
import type { Landing, LandingRepo } from './ports'

const S = 'store'
const PID = '00000000-0000-4000-8000-000000000001'

const fakeRepo = (): LandingRepo & { rows: Landing[] } => {
  const rows: Landing[] = []
  const clash = (slug: string, id?: string) => rows.some((r) => r.slug === slug && r.id !== id)
  return {
    rows,
    list: async () => rows,
    bySlug: async (_s, slug) => rows.find((r) => r.slug === slug) ?? null,
    byId: async (_s, id) => rows.find((r) => r.id === id) ?? null,
    insert: async (_s, page: LandingData) => {
      if (clash(page.slug)) return null
      const id = `l${rows.length + 1}`
      rows.push({ ...page, id, visits: 0, orders: 0, createdAt: new Date(0) })
      return id
    },
    update: async (_s, id, page) => {
      if (clash(page.slug, id)) return null
      const i = rows.findIndex((r) => r.id === id)
      if (i < 0) return false
      rows[i] = { ...rows[i]!, ...page }
      return true
    },
    remove: async (_s, id) => {
      rows.splice(
        rows.findIndex((r) => r.id === id),
        1,
      )
    },
    addVisit: async (_s, id) => {
      rows.find((r) => r.id === id)!.visits++
    },
  }
}

const setup = () => {
  const repo = fakeRepo()
  const landing = createLanding({
    repo,
    product: async (_s, id) =>
      id === PID
        ? { name: 'Rose Attar', description: '', price: 1000, compareAtPrice: null }
        : null,
  })
  return { repo, landing }
}
const input = { title: 'Eid', slug: 'eid', productId: PID, design: 'warm' as const }

describe('landing service', () => {
  it('creates a filled page, refuses a missing product or a taken slug', async () => {
    const { landing, repo } = setup()
    const id = await landing.create(S, input, 'en')
    expect(repo.rows[0]).toMatchObject({ id, design: 'warm', hidden: false })
    expect(repo.rows[0]!.blocks[0]!.title).toBe('Rose Attar')
    await expect(landing.create(S, input, 'en')).rejects.toThrow('landing.slug_taken')
    await expect(
      landing.create(S, { ...input, productId: '00000000-0000-4000-8000-000000000009' }, 'en'),
    ).rejects.toThrow('product.not_found')
  })

  it('saves, hides, copies and removes', async () => {
    const { landing, repo } = setup()
    const a = await landing.create(S, input, 'en')
    const b = await landing.create(S, { ...input, slug: 'b' }, 'en')
    const page = await landing.get(S, a)
    await landing.save(S, a, { ...page, title: 'Eid sale' })
    expect(repo.rows[0]!.title).toBe('Eid sale')
    await expect(landing.save(S, a, { ...page, slug: 'b' })).rejects.toThrow('landing.slug_taken')
    await expect(landing.save(S, 'gone', { ...page, slug: 'free' })).rejects.toThrow(
      'landing.not_found',
    )
    await expect(landing.get(S, 'gone')).rejects.toThrow('landing.not_found')

    expect(await landing.forShoppers(S, 'eid')).toMatchObject({ id: a })
    await landing.setHidden(S, a, true)
    expect(await landing.forShoppers(S, 'eid')).toBeNull()
    expect(await landing.forShoppers(S, 'nope')).toBeNull()

    const c = await landing.copy(S, b)
    expect(repo.rows.find((r) => r.id === c)).toMatchObject({
      slug: 'b-copy',
      title: 'Eid (copy)',
      hidden: true,
    })
    await landing.visit(S, b)
    expect((await landing.list(S)).find((r) => r.id === b)!.visits).toBe(1)
    await landing.remove(S, c)
    expect(repo.rows).toHaveLength(2)
  })

  it('takes the pack saving off the plain price', async () => {
    const { landing } = setup()
    const page = await landing.get(S, await landing.create(S, input, 'en'))
    expect(landing.discount(page, 3, 1000)).toBe(300)
    expect(landing.discount(page, 5, 1000)).toBe(0)
  })

  it('gives an order the page and its pack price, and refuses anything else', async () => {
    const { landing } = setup()
    const id = await landing.create(S, input, 'en')
    expect(await landing.orderTerms(S, id, [{ productId: PID, quantity: 2 }])).toEqual({
      source: 'landing',
      landingId: id,
      discount: 100,
    })
    const other = { productId: '00000000-0000-4000-8000-000000000009', quantity: 1 }
    for (const items of [[other], [{ productId: PID, quantity: 1 }, other], []])
      await expect(landing.orderTerms(S, id, items)).rejects.toThrow('landing.not_found')
    await expect(landing.orderTerms(S, 'gone', [{ productId: PID, quantity: 1 }])).rejects.toThrow(
      'landing.not_found',
    )
    await landing.setHidden(S, id, true)
    await expect(landing.orderTerms(S, id, [{ productId: PID, quantity: 1 }])).rejects.toThrow(
      'landing.not_found',
    )
  })
})
