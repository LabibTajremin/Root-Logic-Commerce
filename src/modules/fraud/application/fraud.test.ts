import { describe, expect, it } from 'vitest'
import { createFraud, type FraudRepo } from './fraud'

const rules = { perWindow: 3, windowHours: 24, duplicateHours: 12, blockDuplicates: true }
const client = { phone: '01711111111', ip: '1.2.3.4', deviceId: 'd1' }

const setup = (state: { blocked?: boolean; recent?: number; dup?: boolean } = {}) => {
  const calls: unknown[][] = []
  const repo: FraudRepo = {
    addBlock: async (...a) => void calls.push(['add', ...a]),
    removeBlock: async (...a) => void calls.push(['remove', ...a]),
    listBlocks: async () => [],
    isBlocked: async () => state.blocked ?? false,
    recentOrders: async (_s, _c, since) => (calls.push(['since', since]), state.recent ?? 0),
    hasDuplicate: async (_s, _p, _ids, since) => (calls.push(['dup', since]), state.dup ?? false),
    logAttempt: async (...a) => void calls.push(['log', ...a]),
    attempts: async (_s, n) => (calls.push(['attempts', n]), []),
    riskyPhones: async (_s, n) => (calls.push(['risky', n]), []),
  }
  const fraud = createFraud({ repo, now: () => new Date('2026-05-02T12:00:00Z') })
  return { fraud, calls }
}

describe('fraud', () => {
  it('lets a normal order through, checking the windows', async () => {
    const { fraud, calls } = setup({ recent: 2 })
    await fraud.check('s', client, ['p1'], rules)
    expect(calls).toEqual([
      ['since', new Date('2026-05-01T12:00:00Z')],
      ['dup', new Date('2026-05-02T00:00:00Z')],
    ])
  })

  it('refuses blocked clients, too many orders and duplicates, and logs each', async () => {
    for (const [state, code] of [
      [{ blocked: true }, 'order.blocked'],
      [{ recent: 3 }, 'order.too_many'],
      [{ dup: true }, 'order.duplicate'],
    ] as const) {
      const { fraud, calls } = setup(state)
      await expect(fraud.check('s', client, ['p1'], rules)).rejects.toThrow(code)
      expect(calls).toContainEqual(['log', 's', { ...client, reason: code.slice(6) }])
    }
  })

  it('skips the limit at 0 and duplicates unless blocking them', async () => {
    const { fraud, calls } = setup({ recent: 99, dup: true })
    await fraud.check('s', client, ['p1'], { ...rules, perWindow: 0, blockDuplicates: false })
    expect(calls).toEqual([])
  })

  it('blocks normalized phones, unblocks, reports', async () => {
    const { fraud, calls } = setup()
    await fraud.block('s', { kind: 'phone', value: '+880 1711-111111' })
    await fraud.block('s', { kind: 'ip', value: ' 9.9.9.9 ', note: 'spam' })
    await expect(fraud.block('s', { kind: 'phone', value: '12' })).rejects.toThrow('validation')
    await fraud.unblock('s', 'b1')
    expect(await fraud.report('s')).toEqual({ attempts: [], risky: [] })
    expect(await fraud.listBlocks('s')).toEqual([])
    expect(calls).toEqual([
      ['add', 's', { kind: 'phone', value: '01711111111', note: '' }],
      ['add', 's', { kind: 'ip', value: '9.9.9.9', note: 'spam' }],
      ['remove', 's', 'b1'],
      ['attempts', 50],
      ['risky', 10],
    ])
  })

  it('uses the clock by default', async () => {
    let since = new Date(0)
    const repo = {
      isBlocked: async () => false,
      recentOrders: async (_s: string, _c: unknown, d: Date) => ((since = d), 0),
    } as unknown as FraudRepo
    await createFraud({ repo }).check('s', client, [], { ...rules, blockDuplicates: false })
    expect(Date.now() - since.getTime()).toBeGreaterThanOrEqual(24 * 3_600_000)
  })
})
