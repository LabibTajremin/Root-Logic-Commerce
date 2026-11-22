import { describe, expect, it } from 'vitest'
import { pageInput, pageTemplates, parseBody, parseInline } from './pages'

describe('CMS page text (J8)', () => {
  it('reads headings, lists and paragraphs from plain text', () => {
    expect(parseBody('## Story\r\n\r\nLine one\nline two\n\n- a\n- b\n\n### Small\n\n\n')).toEqual([
      { kind: 'h2', text: 'Story' },
      { kind: 'p', text: 'Line one line two' },
      { kind: 'ul', items: ['a', 'b'] },
      { kind: 'h3', text: 'Small' },
    ])
    expect(parseBody('')).toEqual([])
  })

  it('bold runs stay text, never markup', () => {
    expect(parseInline('Return in **7 days** <b>x</b>')).toEqual([
      { bold: false, text: 'Return in ' },
      { bold: true, text: '7 days' },
      { bold: false, text: ' <b>x</b>' },
    ])
  })

  it('slugs are normalised; templates are valid pages in both languages', () => {
    const base = { title: 'A', body: '', published: true, inFooter: false }
    expect(pageInput.parse({ ...base, slug: ' About-Us ' }).slug).toBe('about-us')
    expect(pageInput.safeParse({ ...base, slug: 'a b' }).success).toBe(false)
    for (const l of ['en', 'bn'] as const)
      for (const t of pageTemplates[l])
        expect(pageInput.safeParse({ ...t, published: true, inFooter: true }).success).toBe(true)
    expect(pageTemplates.en.map((t) => t.slug)).toEqual(pageTemplates.bn.map((t) => t.slug))
  })
})
