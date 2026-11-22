import { describe, expect, it } from 'vitest'
import { createPages } from './pages'
import type { Page, PagesRepo } from './ports'

const setup = () => {
  const rows: (Page & { storeId: string })[] = []
  const repo: PagesRepo = {
    list: async (s) => rows.filter((r) => r.storeId === s),
    insert: async (s, input) => {
      if (rows.some((r) => r.storeId === s && r.slug === input.slug)) return null
      const p = { ...input, id: `p${rows.length}`, storeId: s, sortOrder: rows.length }
      rows.push(p)
      return p
    },
    update: async (s, id, input) => {
      const p = rows.find((r) => r.storeId === s && r.id === id)
      if (!p) return false
      if (rows.some((r) => r.storeId === s && r.id !== id && r.slug === input.slug)) return null
      return (Object.assign(p, input), true)
    },
    remove: async (s, id) =>
      void rows.splice(
        rows.findIndex((r) => r.storeId === s && r.id === id),
        1,
      ),
  }
  return createPages({ repo })
}
const page = { slug: 'faq', title: 'FAQ', body: '', published: false, inFooter: false }

describe('pages', () => {
  it('creates, hides drafts from shoppers, updates and removes', async () => {
    const p = setup()
    const a = await p.create('s', page)
    await expect(p.create('s', page)).rejects.toThrow('pages.slug_taken')
    await expect(p.create('s', { ...page, title: '' })).rejects.toThrow('validation')
    expect(await p.get('s', 'faq')).toBeNull()
    await p.update('s', a.id, { ...page, published: true })
    expect((await p.get('s', 'faq'))?.title).toBe('FAQ')
    expect(await p.published('s')).toHaveLength(1)
    const b = await p.create('s', { ...page, slug: 'help' })
    await expect(p.update('s', b.id, page)).rejects.toThrow('pages.slug_taken')
    await expect(p.update('s', 'nope', page)).rejects.toThrow('pages.not_found')
    await p.remove('s', a.id)
    expect((await p.list('s')).map((x) => x.slug)).toEqual(['help'])
  })

  it('adds only the missing standard pages, published and in the footer', async () => {
    const p = setup()
    await p.create('s', { ...page, slug: 'about' })
    await p.addTemplates('s', 'bn')
    const all = await p.list('s')
    expect(all).toHaveLength(5)
    expect(all.find((x) => x.slug === 'privacy')).toMatchObject({
      title: 'প্রাইভেসি পলিসি',
      published: true,
      inFooter: true,
    })
    expect(all.find((x) => x.slug === 'about')?.title).toBe('FAQ')
  })
})
