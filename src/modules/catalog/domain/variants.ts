import { z } from 'zod'

const word = z.string().trim().min(1).max(40)

/** A1: up to three options (size, colour, …), each with its values in shop order. */
export const productOptions = z
  .array(z.object({ name: word, values: z.array(word).min(1).max(30) }))
  .max(3)
  .default([])
export type ProductOptions = z.output<typeof productOptions>
export type VariantOptions = Record<string, string>

const money = z.number().int().nonnegative()
export const variantInput = z
  .object({
    options: z.record(z.string(), z.string()),
    price: money,
    compareAtPrice: money.nullable(),
    costPrice: money,
    stock: z.number().int().nonnegative(),
    sku: z.string().trim().max(64).nullable(),
  })
  .refine((v) => v.compareAtPrice === null || v.compareAtPrice > v.price, {
    path: ['compareAtPrice'],
    message: 'compare-at price must be higher than price',
  })
export type VariantData = z.output<typeof variantInput>

/** The admin types options as "Size: S, M, L", one option per line. */
export const optionsFromText = (text: string): ProductOptions =>
  text.split('\n').flatMap((line) => {
    const i = line.indexOf(':')
    const name = line.slice(0, i).trim()
    const values = [
      ...new Set(
        line
          .slice(i + 1)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ]
    return i > 0 && name && values.length > 0 ? [{ name, values }] : []
  })

export const optionsToText = (o: ProductOptions) =>
  o.map((x) => `${x.name}: ${x.values.join(', ')}`).join('\n')

export const variantLabel = (o: ProductOptions, v: VariantOptions) =>
  o.map((x) => v[x.name]).join(' / ')

type Row = { id?: string; options: VariantOptions }

/**
 * Every combination of the options, in shop order. A combination the owner already
 * priced keeps its row (matched by label); new ones start from the given defaults.
 */
export const mergeMatrix = <R extends Row>(
  o: ProductOptions,
  existing: R[],
  defaults: Omit<R, 'id' | 'options'>,
): (Omit<R, 'id'> & { id?: string })[] => {
  if (o.length === 0) return []
  const combos = o.reduce<VariantOptions[]>(
    (acc, x) => acc.flatMap((c) => x.values.map((v) => ({ ...c, [x.name]: v }))),
    [{}],
  )
  const byLabel = new Map(existing.map((r) => [variantLabel(o, r.options), r]))
  return combos.map((options) => {
    const old = byLabel.get(variantLabel(o, options))
    return old ? { ...old, options } : ({ ...defaults, options } as Omit<R, 'id'>)
  })
}
