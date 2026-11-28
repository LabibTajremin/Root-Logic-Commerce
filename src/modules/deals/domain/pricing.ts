// Zod-free on purpose: the cart summary in the browser uses the same rules as the server.

export type Combo = {
  id: string
  name: string
  slug: string
  on: boolean
  items: { productId: string; qty: number }[]
  /** The whole bundle's price (minor units). */
  price: number
}

export type FlashItem = { productId: string; price: number | null; percent: number | null }
export type FlashSale = {
  on: boolean
  name: string
  startsAt: Date
  endsAt: Date
  /** Units per product sold at the sale price; after that the normal price is back. */
  cap: number | null
  items: FlashItem[]
}

type Line = { productId: string; unitPrice: number; quantity: number }

/** A9: what the shown combos take off these lines — each full set of a combo's items, once per set. */
export const comboSaving = (lines: Line[], combos: Combo[]) => {
  const left = new Map<string, number>()
  const unit = new Map<string, number>()
  for (const l of lines) {
    left.set(l.productId, (left.get(l.productId) ?? 0) + l.quantity)
    unit.set(l.productId, l.unitPrice)
  }
  let saving = 0
  for (const c of combos.filter((x) => x.on && x.items.length > 0)) {
    const sets = Math.min(...c.items.map((i) => Math.floor((left.get(i.productId) ?? 0) / i.qty)))
    const full = c.items.reduce((n, i) => n + (unit.get(i.productId) ?? 0) * i.qty, 0)
    if (sets === 0 || full <= c.price) continue
    for (const i of c.items) left.set(i.productId, left.get(i.productId)! - sets * i.qty)
    saving += sets * (full - c.price)
  }
  return saving
}

/** A9: "N% less" for a combo against its items at their own prices. */
export const comboPercent = (full: number, price: number) =>
  full > price ? Math.round(((full - price) / full) * 100) : 0

/** B11: is the sale running at `now`? */
export const flashLive = (sale: FlashSale | null, now: Date) =>
  !!sale && sale.on && sale.startsAt <= now && now < sale.endsAt

/**
 * B11: the sale price of one unit, or null when this product is not on sale now
 * (outside the window, not listed, or its capped units are sold). Never above `unit`.
 */
export const flashPrice = (
  sale: FlashSale | null,
  productId: string,
  unit: number,
  now: Date,
  sold = 0,
) => {
  if (!flashLive(sale, now)) return null
  const item = sale!.items.find((i) => i.productId === productId)
  if (!item || (sale!.cap !== null && sold >= sale!.cap)) return null
  const price = item.price ?? Math.round((unit * (100 - item.percent!)) / 100)
  return Math.min(price, unit)
}
