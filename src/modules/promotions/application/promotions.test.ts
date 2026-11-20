import { describe, expect, it } from 'vitest'
import { createPromotions } from './promotions'
import type { Banner, BannersRepo } from './ports'

const setup = () => {
  const rows: (Banner & { storeId: string })[] = []
  const repo: BannersRepo = {
    list: async (s) =>
      rows.filter((r) => r.storeId === s).sort((a, b) => a.sortOrder - b.sortOrder),
    insert: async (s, data) => {
      const b = { id: `b${rows.length}`, storeId: s, data, active: true, sortOrder: rows.length }
      rows.push(b)
      return b
    },
    setActive: async (s, id, active) => {
      const b = rows.find((r) => r.storeId === s && r.id === id)
      return b ? ((b.active = active), true) : false
    },
    remove: async (s, id) =>
      void rows.splice(
        rows.findIndex((r) => r.storeId === s && r.id === id),
        1,
      ),
    setOrder: async (_s, ids) =>
      ids.forEach((id, i) => (rows.find((r) => r.id === id)!.sortOrder = i)),
  }
  return { p: createPromotions({ repo }), rows }
}
const poster = {
  kind: 'poster',
  background: '#000000',
  imageId: null,
  headline: 'Eid',
  sub: '',
  cta: '',
  href: '',
}

describe('promotions', () => {
  it('validates, lists, toggles, reorders and removes banners', async () => {
    const { p } = setup()
    await expect(p.create('s', { ...poster, headline: '' })).rejects.toThrow('validation')
    const a = await p.create('s', poster)
    const b = await p.create('s', {
      kind: 'embed',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      caption: 'Watch',
    })
    await p.setActive('s', a.id, false)
    expect((await p.active('s')).map((x) => x.id)).toEqual([b.id])
    await p.reorder('s', [b.id, a.id])
    expect((await p.list('s')).map((x) => x.id)).toEqual([b.id, a.id])
    await expect(p.setActive('other', a.id, true)).rejects.toThrow('banner.not_found')
    await p.remove('s', a.id)
    expect(await p.list('s')).toHaveLength(1)
  })
})
