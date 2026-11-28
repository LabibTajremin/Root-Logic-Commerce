import { z } from 'zod'

export const popupKinds = ['offer', 'product', 'exit', 'newsletter'] as const

/** B8: an owner's popup — what it says, where, when and how often. */
export const popupSchema = z
  .object({
    id: z.uuid(),
    on: z.boolean().default(true),
    kind: z.enum(popupKinds),
    title: z.string().trim().min(1).max(80),
    text: z.string().trim().max(300).default(''),
    /** Product promo: the product shown with Buy | Not now. */
    productId: z.uuid().nullable().default(null),
    cta: z.string().trim().max(40).default(''),
    href: z
      .string()
      .trim()
      .regex(/^(\/[^\s]*|https:\/\/[^\s]+)?$/)
      .default(''),
    pages: z.enum(['all', 'home', 'product', 'checkout']).default('all'),
    trigger: z.enum(['delay', 'scroll', 'exit']).default('delay'),
    delay: z.number().int().min(0).max(120).default(5),
    scroll: z.number().int().min(10).max(100).default(50),
    everyDays: z.number().int().min(0).max(30).default(1),
    device: z.enum(['all', 'mobile', 'desktop']).default('all'),
  })
  .refine((p) => p.kind !== 'product' || p.productId !== null, { path: ['productId'] })
export type Popup = z.output<typeof popupSchema>
