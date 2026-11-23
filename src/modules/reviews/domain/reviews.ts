import { z } from 'zod'

/** A7: what a shopper writes about a product they received. */
export const reviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(1000),
  name: z.string().trim().min(1).max(60),
})
export type ReviewInput = z.input<typeof reviewInput>
export const reviewStatuses = ['pending', 'approved', 'rejected'] as const
export type ReviewStatus = (typeof reviewStatuses)[number]

/** Average to one decimal over approved reviews only; null when there are none. */
export const summarize = (ratings: number[]) =>
  ratings.length === 0
    ? null
    : {
        count: ratings.length,
        average: Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10,
      }
