import { describe, expect, it } from 'vitest'
import { pickBoughtTogether, pickRelated } from './related'

type P = {
  id: string
  categoryId: string | null
  status: string
  stock: number
  options: unknown[]
}
const p = (id: string, o: Partial<P> = {}): P => ({
  id,
  categoryId: 'c1',
  status: 'active',
  stock: 5,
  options: [],
  ...o,
})

describe('related and bought-together picks (A8)', () => {
  const all = [
    p('me', { categoryId: 'c1' }),
    p('a', { categoryId: 'c2' }),
    p('b'),
    p('c'),
    p('draft', { status: 'draft' }),
    p('d', { categoryId: null }),
  ]

  it('related: the owner’s picks first, then the same category, never itself or inactive', () => {
    const me = all[0]!
    expect(
      pickRelated({ ...me, relatedIds: ['a', 'draft', 'ghost'] }, all, 3).map((x) => x.id),
    ).toEqual(['a', 'b', 'c'])
    expect(pickRelated({ ...me, relatedIds: [] }, all, 1).map((x) => x.id)).toEqual(['b'])
    expect(pickRelated({ ...p('d', { categoryId: null }), relatedIds: [] }, all, 4)).toEqual([])
  })

  it('bought together: the owner’s picks, else most co-purchased; only in-stock plain products', () => {
    const shop = [...all, p('v', { options: [{}] }), p('empty', { stock: 0 })]
    const me = { ...shop[0]!, fbtIds: [] as string[] }
    expect(pickBoughtTogether(me, shop, ['v', 'c', 'empty', 'a', 'b'], 2).map((x) => x.id)).toEqual(
      ['c', 'a'],
    )
    expect(
      pickBoughtTogether({ ...me, fbtIds: ['b', 'v'] }, shop, ['c'], 3).map((x) => x.id),
    ).toEqual(['b'])
    expect(pickBoughtTogether({ ...me, stock: 0 }, shop, ['c'], 3)).toEqual([])
    expect(pickBoughtTogether({ ...me, options: [{}] }, shop, ['c'], 3)).toEqual([])
  })
})
