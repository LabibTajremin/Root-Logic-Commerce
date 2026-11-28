import { describe, expect, it } from 'vitest'
import { createReels, type Reel, type ReelsRepo } from './reels'

const U = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const fake = (): ReelsRepo & { rows: Reel[] } => {
  const rows: Reel[] = []
  return {
    rows,
    list: async () => [...rows].sort((a, b) => a.sortOrder - b.sortOrder),
    insert: async (_s, r) => {
      const id = `r${rows.length + 1}`
      rows.push({ ...r, id, sortOrder: rows.length })
      return id
    },
    remove: async (_s, id) =>
      void rows.splice(
        rows.findIndex((r) => r.id === id),
        1,
      ),
    setOrder: async (_s, ids) =>
      ids.forEach((id, i) => (rows.find((r) => r.id === id)!.sortOrder = i)),
  }
}

describe('reels (B4)', () => {
  it('takes one source; links must play, and token-only links need a cover', async () => {
    const reels = createReels({ repo: fake() })
    await expect(reels.add('s', {})).rejects.toThrow('reel.source')
    await expect(
      reels.add('s', { videoId: U(1), url: 'https://youtu.be/dQw4w9WgXcQ' }),
    ).rejects.toThrow('reel.source')
    await expect(reels.add('s', { url: 'https://example.com/v' })).rejects.toThrow('reel.link')
    await expect(reels.add('s', { url: 'https://www.instagram.com/reel/Cx1/' })).rejects.toThrow(
      'reel.cover',
    )
    expect(
      await reels.add('s', { url: 'https://www.instagram.com/reel/Cx1/', coverId: U(2) }),
    ).toBe('r1')
    expect(await reels.add('s', { url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe('r2')
    expect(await reels.add('s', { videoId: U(1), productIds: [U(3)] })).toBe('r3')
  })

  it('lists by product, moves within the ends and removes', async () => {
    const repo = fake()
    const reels = createReels({ repo })
    for (const p of [U(3), U(4), U(3)]) await reels.add('s', { videoId: U(1), productIds: [p] })
    expect((await reels.forProduct('s', U(3))).map((r) => r.id)).toEqual(['r1', 'r3'])
    await reels.move('s', 'r3', -1)
    expect((await reels.list('s')).map((r) => r.id)).toEqual(['r1', 'r3', 'r2'])
    await reels.move('s', 'r1', -1)
    await reels.move('s', 'r2', 1)
    await reels.move('s', 'gone', 1)
    expect((await reels.list('s')).map((r) => r.id)).toEqual(['r1', 'r3', 'r2'])
    await reels.remove('s', 'r3')
    expect(repo.rows).toHaveLength(2)
  })
})
