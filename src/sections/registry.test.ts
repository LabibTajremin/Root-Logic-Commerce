import { describe, expect, it } from 'vitest'
import { defaultLayout, isSectionId, layoutOf, resolveSections } from './registry'

describe('sections registry', () => {
  it('renders only enabled, known sections whose settings validate', () => {
    expect(
      resolveSections([
        { sectionId: 'hero', enabled: true, settings: {} },
        { sectionId: 'product-grid', enabled: false, settings: {} },
        { sectionId: 'gone', enabled: true, settings: {} },
        { sectionId: 'category-nav', enabled: true, settings: { stale: 1 } },
      ]),
    ).toEqual([{ id: 'hero', settings: {} }])
    expect(isSectionId('hero')).toBe(true)
    expect(isSectionId('toString')).toBe(false)
  })

  it('falls back to the default layout when nothing valid is stored', () => {
    expect(layoutOf(null)).toEqual(defaultLayout)
    expect(layoutOf({ preset: 'x', home: 'nope' })).toEqual(defaultLayout)
    const saved = { preset: 'general', home: [{ sectionId: 'hero', enabled: true, settings: {} }] }
    expect(layoutOf(saved)).toEqual(saved)
    expect(resolveSections(defaultLayout.home).map((s) => s.id)).toEqual([
      'promo-banners',
      'hero',
      'category-nav',
      'product-grid',
    ])
  })
})
