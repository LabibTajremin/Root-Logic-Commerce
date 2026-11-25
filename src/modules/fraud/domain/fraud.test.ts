import { describe, expect, it } from 'vitest'
import { noHistory, riskyScore, scoreAction, successPct } from './fraud'

describe('courier score (D2)', () => {
  it('a score rule needs enough finished orders and a low success rate', () => {
    const h = { total: 4, delivered: 1, returned: 3 }
    const rule = { minPct: 50, minOrders: 3, action: 'hold' as const }
    expect(successPct(h)).toBe(25)
    expect(successPct(noHistory)).toBeNull()
    expect(scoreAction(h, rule)).toBe('hold')
    expect(scoreAction(h, { ...rule, minOrders: 5 })).toBeNull()
    expect(scoreAction(h, { ...rule, minPct: 20 })).toBeNull()
    expect(scoreAction(noHistory, { ...rule, minOrders: 0 })).toBeNull()
    expect(scoreAction(h, { ...rule, minPct: 0 })).toBeNull()
    expect([riskyScore(25), riskyScore(60), riskyScore(null)]).toEqual([true, false, false])
  })
})
