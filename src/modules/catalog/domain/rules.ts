import { z } from 'zod'
import { DomainError } from '@/modules/shared'

export type CategoryNode = { id: string; parentId: string | null }

// Moving a category under one of its own descendants would orphan the subtree.
export const assertNoCycle = (all: CategoryNode[], id: string, parentId: string | null) => {
  const parentOf = new Map(all.map((c) => [c.id, c.parentId]))
  for (let p = parentId; p; p = parentOf.get(p) ?? null) {
    if (p === id) throw new DomainError('category.cycle')
  }
}

export const toSortOrders = (orderedIds: string[]) =>
  orderedIds.map((id, i) => ({ id, sortOrder: i }))

const money = z.number().int().nonnegative()

export const productInput = z
  .object({
    name: z.string().trim().min(1).max(200),
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(80)
      .optional(),
    description: z.string().max(5000).default(''),
    price: money,
    compareAtPrice: money.nullable().default(null),
    costPrice: money.default(0),
    stock: z.number().int().nonnegative().default(0),
    lowStockThreshold: z.number().int().nonnegative().default(5),
    sku: z.string().trim().max(64).nullable().default(null),
    status: z.enum(['draft', 'active', 'archived']).default('draft'),
    categoryId: z.uuid().nullable().default(null),
    videoUrl: z.url().nullable().default(null),
    seoTitle: z.string().max(70).nullable().default(null),
    seoDescription: z.string().max(170).nullable().default(null),
  })
  .refine((p) => p.compareAtPrice === null || p.compareAtPrice > p.price, {
    path: ['compareAtPrice'],
    message: 'compare-at price must be higher than price',
  })

export type ProductInput = z.input<typeof productInput>
export type ProductData = z.output<typeof productInput>

export const categoryInput = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(80)
    .optional(),
  parentId: z.uuid().nullable().default(null),
  seoTitle: z.string().max(70).nullable().default(null),
  seoDescription: z.string().max(170).nullable().default(null),
})
export type CategoryInput = z.input<typeof categoryInput>
