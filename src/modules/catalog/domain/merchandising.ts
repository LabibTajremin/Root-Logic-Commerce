import type { BadgeTone } from './rules'

export type CardBadge = { text: string; tone: BadgeTone }

type Priced = {
  price: number
  compareAtPrice: number | null
  badge: CardBadge | null
}

/** A3: "Save N%" from the compare-at price (rounded down, never overstated), then the owner's badge. */
export const cardBadges = (p: Priced, save: (pct: number) => string): CardBadge[] => [
  ...(p.compareAtPrice !== null
    ? [{ text: save(Math.floor((1 - p.price / p.compareAtPrice) * 100)), tone: 'danger' as const }]
    : []),
  ...(p.badge ? [p.badge] : []),
]

/** A4: "only N left" once stock reaches the product's low-stock threshold (never at 0: that's sold out). */
export const stockLeft = (p: { stock: number; lowStockThreshold: number }, show: boolean) =>
  show && p.stock > 0 && p.stock <= p.lowStockThreshold ? p.stock : null
