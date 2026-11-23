import { describe, expect, it } from 'vitest'
import {
  defaultLayout,
  isPresetId,
  isSectionId,
  layoutOf,
  presetIds,
  presetLayout,
  previewPreset,
  resolveSections,
  withAllSections,
} from './registry'

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

  it('every preset only uses registered sections and is a valid layout', () => {
    for (const id of presetIds) {
      const l = presetLayout(id)
      expect(layoutOf(l)).toEqual(l)
      expect(l.home.every((r) => isSectionId(r.sectionId))).toBe(true)
    }
    expect(resolveSections(presetLayout('gadget').home).map((s) => s.id)).not.toContain('hero')
    expect(isPresetId('fashion')).toBe(true)
    expect(isPresetId('constructor')).toBe(false)
    expect(previewPreset('gadget')).toBe('gadget')
    expect(previewPreset('retired')).toBeNull()
    expect(previewPreset(null)).toBeNull()
  })

  it('the builder lists stored sections first, then new ones switched off (B5)', () => {
    const all = withAllSections({
      preset: 'general',
      home: [
        { sectionId: 'brands', enabled: true, settings: {} },
        { sectionId: 'gone', enabled: true, settings: {} },
      ],
    })
    expect(all[0]).toEqual({ sectionId: 'brands', enabled: true, settings: {} })
    expect(all.find((r) => r.sectionId === 'trust-strip')).toEqual({
      sectionId: 'trust-strip',
      enabled: false,
      settings: {},
    })
    expect(all.map((r) => r.sectionId)).not.toContain('gone')
    expect(new Set(all.map((r) => r.sectionId)).size).toBe(all.length)
  })

  it('category rows default to 4 per row', () => {
    expect(resolveSections([{ sectionId: 'category-rows', enabled: true, settings: {} }])).toEqual([
      { id: 'category-rows', settings: { count: 4 } },
    ])
  })
})
