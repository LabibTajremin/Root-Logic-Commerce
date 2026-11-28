import { describe, expect, it } from 'vitest'
import { createBannersRepo } from '@/infrastructure/db/repositories/banners-repo'
import { createPromotions } from '@/modules/promotions'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

const poster = (headline: string) => ({
  kind: 'poster' as const,
  background: '#000000',
  imageId: null,
  headline,
  sub: '',
  cta: '',
  href: '',
})

describe('banners repo', () => {
  it('appends, toggles, reorders and removes per store', async () => {
    const db = await createTestDb()
    const [a, b] = [await seedStore(db, 'a'), await seedStore(db, 'b')]
    const p = createPromotions({ repo: createBannersRepo(db) })
    const x = await p.create(a, poster('X'))
    const y = await p.create(a, { kind: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ', caption: '' })
    await p.create(b, poster('other store'))
    expect((await p.list(a)).map((r) => [r.data.kind, r.sortOrder])).toEqual([
      ['poster', 0],
      ['embed', 1],
    ])
    await p.setActive(a, x.id, false)
    await p.reorder(a, [y.id, x.id])
    expect((await p.list(a)).map((r) => [r.data, r.active])).toEqual([
      [{ kind: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ', caption: '' }, true],
      [poster('X'), false],
    ])
    await expect(p.setActive(b, x.id, true)).rejects.toThrow('banner.not_found')
    await p.remove(a, x.id)
    expect(await p.list(a)).toHaveLength(1)
    expect(await p.list(b)).toHaveLength(1)
  })
})
