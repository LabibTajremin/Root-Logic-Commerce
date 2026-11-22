import { describe, expect, it } from 'vitest'
import { cardBadges, stockLeft } from './merchandising'

const save = (pct: number) => `Save ${pct}%`

describe('merchandising (A3, A4)', () => {
  it('shows the saving first, then the owner badge', () => {
    expect(cardBadges({ price: 850, compareAtPrice: 1040, badge: null }, save)).toEqual([
      { text: 'Save 18%', tone: 'danger' },
    ])
    expect(
      cardBadges(
        { price: 500, compareAtPrice: null, badge: { text: 'New', tone: 'accent' } },
        save,
      ),
    ).toEqual([{ text: 'New', tone: 'accent' }])
    expect(cardBadges({ price: 500, compareAtPrice: null, badge: null }, save)).toEqual([])
  })

  it('counts stock left only at or under the threshold, when the owner shows it', () => {
    expect(stockLeft({ stock: 3, lowStockThreshold: 5 }, true)).toBe(3)
    expect(stockLeft({ stock: 6, lowStockThreshold: 5 }, true)).toBeNull()
    expect(stockLeft({ stock: 0, lowStockThreshold: 5 }, true)).toBeNull()
    expect(stockLeft({ stock: 3, lowStockThreshold: 5 }, false)).toBeNull()
  })
})
