import { describe, expect, it } from 'vitest'
import { createDrafts, type Draft, type DraftsRepo } from './drafts'

const setup = () => {
  const calls: unknown[][] = []
  const rows: Draft[] = []
  const repo: DraftsRepo = {
    upsert: async (...a) => void calls.push(['upsert', ...a]),
    list: async (...a) => (calls.push(['list', ...a]), rows),
    get: async (...a) => (calls.push(['get', ...a]), null),
    remove: async (...a) => void calls.push(['remove', ...a]),
    purge: async (...a) => void calls.push(['purge', ...a]),
  }
  let hits = 0
  const drafts = createDrafts({
    repo,
    allow: () => ++hits <= 2,
    now: () => new Date('2026-03-31T00:00:00Z'),
  })
  return { drafts, calls }
}
const cutoff = new Date('2026-03-01T00:00:00Z')

describe('drafts', () => {
  it('saves a normalized draft with defaults', async () => {
    const { drafts, calls } = setup()
    expect(await drafts.save('s', 'ip', { phone: '+8801711111111', name: ' Rahim ' })).toBe(true)
    expect(calls[0]).toEqual([
      'upsert',
      's',
      {
        phone: '01711111111',
        name: 'Rahim',
        email: '',
        district: '',
        area: '',
        address: '',
        note: '',
        zoneId: '',
        items: [],
      },
    ])
  })

  it('skips an invalid draft and too many saves', async () => {
    const { drafts, calls } = setup()
    expect(await drafts.save('s', 'ip', { phone: '123' })).toBe(false)
    await drafts.save('s', 'ip', { phone: '01711111111' })
    await drafts.save('s', 'ip', { phone: '01711111111' })
    expect(await drafts.save('s', 'ip', { phone: '01711111111' })).toBe(false)
    expect(calls.length).toBe(2)
  })

  it('lists, gets and purges only within 30 days', async () => {
    const { drafts, calls } = setup()
    await drafts.list('s')
    await drafts.get('s', 'd1')
    await drafts.purge()
    expect(calls).toEqual([
      ['list', 's', cutoff],
      ['get', 's', 'd1', cutoff],
      ['purge', cutoff],
    ])
  })

  it('removes by id or by the phone that ordered', async () => {
    const { drafts, calls } = setup()
    await drafts.discard('s', 'd1')
    await drafts.ordered('s', '01711-111111')
    expect(calls).toEqual([
      ['remove', 's', { id: 'd1' }],
      ['remove', 's', { phone: '01711111111' }],
    ])
  })

  it('converts a draft into an order, then drops it', async () => {
    const { drafts, calls } = setup()
    await expect(drafts.convert('s', 'd1', async () => 1)).rejects.toThrow('draft.not_found')
    const row: Draft = {
      id: 'd1',
      updatedAt: new Date(),
      phone: '01711111111',
      name: 'Rahim',
      email: 'r@x.co',
      district: 'Dhaka',
      area: 'Mirpur',
      address: 'House 1',
      note: 'Call first',
      zoneId: 'dhaka',
      items: [],
    }
    const repo = { get: async () => row, remove: async () => void calls.push(['gone']) }
    const d = createDrafts({ repo: repo as never, allow: () => true })
    const placed: unknown[] = []
    expect(await d.convert('s', 'd1', async (i) => (placed.push(i), { id: 'o1' }))).toEqual({
      id: 'o1',
    })
    expect(placed[0]).toMatchObject({ email: 'r@x.co', note: 'Call first', zoneId: 'dhaka' })
    await d.convert('s', 'd1', async (i) => placed.push(i))
    row.email = row.note = ''
    await d.convert('s', 'd1', async (i) => placed.push(i))
    expect(placed[2]).toMatchObject({ email: null, note: null })
    expect(calls.filter((c) => c[0] === 'gone').length).toBe(3)
  })

  it('uses the clock by default', async () => {
    let before = new Date(0)
    const repo = { purge: async (d: Date) => void (before = d) } as DraftsRepo
    await createDrafts({ repo, allow: () => true }).purge()
    expect(Date.now() - before.getTime()).toBeGreaterThanOrEqual(30 * 86_400_000)
  })
})
