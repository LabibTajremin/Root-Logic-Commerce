import { describe, expect, it } from 'vitest'
import {
  baseDesign,
  businessSchema,
  contrastRatio,
  contrastWarnings,
  designSchema,
  mergeDesign,
  passesAA,
  readableOn,
  toCssVars,
  type Design,
} from '..'

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1)
    expect(passesAA('#767676', '#FFFFFF')).toBe(true)
    expect(passesAA('#999999', '#FFFFFF')).toBe(false)
    expect(passesAA('#999999', '#FFFFFF', true)).toBe(false)
    expect(passesAA('#888888', '#FFFFFF', true)).toBe(true)
    expect(readableOn('#18181B')).toBe('#FFFFFF')
    expect(readableOn('#F3E6C8')).toBe('#111111')
  })
})

describe('design', () => {
  it('base design is valid and merges theme defaults then overrides', () => {
    expect(designSchema.parse(baseDesign)).toEqual(baseDesign)
    const merged = mergeDesign(
      baseDesign,
      { colors: { accent: '#C9A45C' }, footer: { socials: [] } },
      { colors: { button: '#000000' } },
      undefined,
    ) as Design
    expect(merged.colors).toEqual({ accent: '#C9A45C', button: '#000000', header: '#FFFFFF' })
    expect(mergeDesign({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] })
  })

  it('rejects anything that could break out of a <style> tag', () => {
    expect(
      designSchema.safeParse(
        mergeDesign(baseDesign, { colors: { accent: 'red;}</style><script>' } }),
      ).success,
    ).toBe(false)
    expect(
      designSchema.safeParse(mergeDesign(baseDesign, { brand: { nameFont: 'Comic"Sans' } }))
        .success,
    ).toBe(false)
    expect(
      designSchema.safeParse(mergeDesign(baseDesign, { header: { opacity: 101 } })).success,
    ).toBe(false)
  })

  it('renders CSS custom properties with auto-contrast text colors', () => {
    const css = toCssVars(
      mergeDesign(baseDesign, {
        mode: { base: 'dark' },
        brand: { nameFont: 'fraunces' },
        header: { opacity: 92 },
      }) as Design,
    )
    expect(css).toContain('--color-bg:#0B1020')
    expect(css).toContain('--color-text:#FFFFFF')
    expect(css).toContain('--color-button-text:#FFFFFF')
    expect(css).toContain('--font-heading:var(--font-fraunces)')
    expect(css).toContain('--header-opacity:0.92')
    const cream = toCssVars(
      mergeDesign(baseDesign, { mode: { light: 'cream' }, colors: { text: '#1E2A1C' } }) as Design,
    )
    expect(cream).toContain('--color-bg:#FBF8F2')
    expect(cream).toContain('--color-text:#1E2A1C')
  })

  it('warns about low-contrast choices', () => {
    expect(contrastWarnings(baseDesign)).toEqual([])
    expect(
      contrastWarnings(
        mergeDesign(baseDesign, { colors: { text: '#EEEEEE', accent: '#F5F5F5' } }) as Design,
      ),
    ).toEqual(['text', 'accent'])
  })
})

describe('business', () => {
  it('has Dhaka delivery zones by default and validates GA4 ids', () => {
    const b = businessSchema.parse({})
    expect(b.deliveryZones.map((z) => z.charge)).toEqual([6000, 13000])
    expect(b.seo.titleTemplate).toBe('%s')
    expect(businessSchema.safeParse({ ga4MeasurementId: 'UA-123' }).success).toBe(false)
    expect(businessSchema.safeParse({ ga4MeasurementId: 'G-7Q2XK1PL0Z' }).success).toBe(true)
  })
})
