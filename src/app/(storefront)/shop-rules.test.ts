import { describe, expect, it } from 'vitest'
import { businessSchema } from '@/modules/site-settings'
import { activeModules, shopRulesOf } from './shop-rules'

describe('shop rules for checkout', () => {
  it('passes combos and the flash sale only while their modules are on', () => {
    const sale = { name: 'Fri', startsAt: '2026-12-01', endsAt: '2026-12-02', items: [] }
    const b = businessSchema.parse({ flashSale: sale })
    const off = shopRulesOf(b, () => false)
    expect(off).toMatchObject({ combos: [], flash: null })
    expect(shopRulesOf(b, () => true).flash).toMatchObject({ name: 'Fri' })
    const on = activeModules([
      { id: 'combos', active: true },
      { id: 'flashSales', active: false },
    ])
    expect([on('combos'), on('flashSales'), on('reels')]).toEqual([true, false, false])
  })
})
