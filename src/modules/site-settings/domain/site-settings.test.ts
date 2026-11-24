import { describe, expect, it } from 'vitest'
import {
  baseDesign,
  businessSchema,
  contrastRatio,
  contrastWarnings,
  backgroundOf,
  brandImages,
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

  it('older saves without floating-button or mobile-menu settings keep everything on', () => {
    const { floating: _f, mobileNav: _m, gallery: _g, ...old } = baseDesign
    const d = designSchema.parse(old)
    expect(d.gallery).toEqual({ fit: 'cover', thumbs: 'below' })
    expect(d.floating).toEqual({
      side: 'right',
      whatsapp: true,
      messenger: true,
      call: true,
      top: true,
    })
    expect(d.mobileNav).toEqual({ search: true, track: true, cart: true })
  })

  it('older saves without product-card toggles show everything', () => {
    const { productCard: _, grid: __, ...old } = baseDesign
    const parsed = designSchema.parse(old)
    expect(parsed.productCard).toEqual({ badges: true, oldPrice: true, button: true })
    expect(parsed.grid).toEqual(baseDesign.grid)
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
    expect(css).toContain('--font-heading:var(--font-fraunces),var(--font-hind-siliguri),serif')
    expect(css).toContain('--header-opacity:0.92')
    expect(css).toContain('--cols-mobile:2;--cols-desktop:4}')
    expect(css).not.toContain('aspect-ratio')
    expect(
      toCssVars(mergeDesign(baseDesign, { grid: { mobile: 1, shape: '4:5' } }) as Design),
    ).toMatch(/--cols-mobile:1;.*\}\.rlc-card \.rlc-media\{aspect-ratio:4\/5\}$/)
    const cream = toCssVars(
      mergeDesign(baseDesign, { mode: { light: 0 }, colors: { text: '#1E2A1C' } }) as Design,
    )
    expect(cream).toContain('--color-bg:#FBF8F2')
    expect(cream).toContain('--color-text:#1E2A1C')
  })

  it('background sliders: cream → white, warm ↔ cool, midnight → black; old names still load', () => {
    const bg = (mode: object) => backgroundOf(mergeDesign(baseDesign, { mode }) as Design)
    expect(bg({ light: 100, warmth: 50 })).toBe('#FFFFFF')
    expect(bg({ light: 100, warmth: 0 })).toBe('#FDF4E9')
    expect(bg({ light: 100, warmth: 100 })).toBe('#F1F6FC')
    expect(bg({ base: 'dark', dark: 100 })).toBe('#0A0A0A')
    const legacy = designSchema.parse(
      mergeDesign(baseDesign, { mode: { light: 'offwhite', dark: 'black' } }),
    )
    expect(legacy.mode).toMatchObject({ light: 50, dark: 100, warmth: 50 })
  })

  it('picks the dark logo on dark shops, the footer logo, and a favicon fallback', () => {
    const ref = (id: string) => ({ kind: 'upload' as const, id })
    const d = (brand: object, base = 'light') =>
      brandImages(mergeDesign(baseDesign, { brand, mode: { base } }) as Design)
    expect(d({})).toEqual({ logo: null, footerLogo: null, favicon: '/icon.svg' })
    expect(d({ logo: ref('a'), favicon: ref('f') })).toEqual({
      logo: '/api/media/a',
      footerLogo: '/api/media/a',
      favicon: '/api/media/f/320',
    })
    expect(d({ logo: ref('a'), darkLogo: ref('b'), footerLogo: ref('c') }, 'dark')).toMatchObject({
      logo: '/api/media/b',
      footerLogo: '/api/media/c',
    })
    expect(d({ logo: ref('a') }, 'dark').logo).toBe('/api/media/a')
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

describe('budget bands (B12)', () => {
  it('reads "label: taka" lines, cheapest first, skipping bad lines', async () => {
    const { bandsFromText, bandsToText } = await import('./business')
    const bands = bandsFromText('Under ৳1,000: 1000\nUnder ৳500 : 500\nno price\nBad: x\n: 9')
    expect(bands).toEqual([
      { label: 'Under ৳500', max: 50000 },
      { label: 'Under ৳1,000', max: 100000 },
    ])
    expect(bandsFromText(bandsToText(bands))).toEqual(bands)
  })
})

describe('checkout fields (C6)', () => {
  it('older saves ask for an optional email and a second phone only', () => {
    expect(businessSchema.parse({}).checkout).toEqual({
      email: 'optional',
      altPhone: true,
      preferredTime: false,
      giftWrap: false,
    })
  })

  it('uses owner text, else the default wording (C10)', async () => {
    const { textOr, businessSchema } = await import('./business')
    expect(textOr('Shukria!', 'Thanks')).toBe('Shukria!')
    expect(textOr('', 'Thanks')).toBe('Thanks')
    expect(businessSchema.parse({}).thankYou).toMatchObject({ accent: '', home: true })
    expect(businessSchema.safeParse({ thankYou: { accent: 'red' } }).success).toBe(false)
  })
})
