import { describe, expect, it } from 'vitest'
import { createContainer } from '@/server/container'
import { createTestDb } from '../fixtures/db'
import { seedStore, testConfig } from '../fixtures/store'

const U = (n: number) => `00000000-0000-4000-8000-00000000000${n}`

describe('reels (B4)', () => {
  it('stores reels per store in the owner’s order', async () => {
    const db = await createTestDb()
    const c = createContainer({ config: testConfig(), db, onEventError: () => {} })
    const [a, b] = [await seedStore(db), await seedStore(db, 'other')]
    const one = await c.reels.add(a, { url: 'https://youtu.be/dQw4w9WgXcQ', caption: 'Unboxing' })
    const two = await c.reels.add(a, { videoId: U(1), productIds: [U(2)] })
    await c.reels.add(b, { videoId: U(1) })
    expect((await c.reels.list(a)).map((r) => r.id)).toEqual([one, two])
    expect(await c.reels.list(a)).toMatchObject([
      { caption: 'Unboxing', videoId: null, productIds: [] },
      { url: null, productIds: [U(2)] },
    ])
    await c.reels.move(a, two, -1)
    expect((await c.reels.list(a)).map((r) => r.id)).toEqual([two, one])
    expect((await c.reels.forProduct(a, U(2))).map((r) => r.id)).toEqual([two])
    await c.reels.remove(b, one)
    await c.reels.remove(a, one)
    expect(await c.reels.list(a)).toHaveLength(1)
    expect(await c.reels.list(b)).toHaveLength(1)
  })
})
