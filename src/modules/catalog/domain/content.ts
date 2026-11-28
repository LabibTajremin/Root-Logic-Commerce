import { z } from 'zod'

const line = z.string().trim().min(1).max(300)
const list = z.array(line).max(30).default([])

/** A6 product page tabs; Details is the product description. Empty tabs are hidden. */
export const productContent = z
  .object({
    specs: z
      .array(z.object({ label: line, value: line }))
      .max(40)
      .default([]),
    howTo: list,
    faq: z
      .array(z.object({ q: line, a: z.string().trim().min(1).max(2000) }))
      .max(30)
      .default([]),
    benefits: list,
    whyBuy: list,
  })
  .prefault({})
export type ProductContent = z.output<typeof productContent>
type ContentText = Record<keyof ProductContent, string>

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

/** The admin form edits each tab as plain text: one entry per line. */
export const contentFromText = (t: ContentText): ProductContent => ({
  specs: lines(t.specs).flatMap((l) => {
    const i = l.indexOf(':')
    return i > 0 ? [{ label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() }] : []
  }),
  howTo: lines(t.howTo),
  // A question on its own line, the answer below it; a blank line starts the next one.
  faq: t.faq
    .split(/\n\s*\n/)
    .map(lines)
    .flatMap(([q, ...a]) => (q && a.length > 0 ? [{ q, a: a.join('\n') }] : [])),
  benefits: lines(t.benefits),
  whyBuy: lines(t.whyBuy),
})

export const contentToText = (c: ProductContent): ContentText => ({
  specs: c.specs.map((s) => `${s.label}: ${s.value}`).join('\n'),
  howTo: c.howTo.join('\n'),
  faq: c.faq.map((f) => `${f.q}\n${f.a}`).join('\n\n'),
  benefits: c.benefits.join('\n'),
  whyBuy: c.whyBuy.join('\n'),
})
