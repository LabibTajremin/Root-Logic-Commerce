/** C3: when delivery is free. Empty / null parts never match. */
export type FreeShippingRule = {
  minSubtotal: number | null
  zoneIds: string[]
  productIds: string[]
}
/** C7: order value bounds in minor units (null = none). */
export type OrderLimits = { minOrder: number | null; maxOrder: number | null }
/** What the shop's checkout settings feed the orders service. */
export type ShopRules<Z> = { zones: Z[]; freeShipping: FreeShippingRule; limits: OrderLimits }

export const shopRules = {
  freeShipping: { minSubtotal: null, zoneIds: [], productIds: [] } as FreeShippingRule,
  limits: { minOrder: null, maxOrder: null } as OrderLimits,
}

/** Free delivery, and how much more gets it by subtotal (the cart's progress hint). */
export const freeShipping = (
  r: FreeShippingRule,
  cart: { subtotal: number; zoneId: string; productIds: string[] },
) => {
  const bySubtotal = r.minSubtotal !== null && cart.subtotal >= r.minSubtotal
  const free =
    bySubtotal ||
    r.zoneIds.includes(cart.zoneId) ||
    cart.productIds.some((p) => r.productIds.includes(p))
  return {
    free,
    remaining: free ? 0 : r.minSubtotal === null ? null : r.minSubtotal - cart.subtotal,
  }
}

type Line = { productId: string; quantity: number; min: number | null; max: number | null }
export type LimitBreach =
  | { code: 'order.min_qty' | 'order.max_qty'; productId: string; limit: number }
  | { code: 'order.min_value' | 'order.max_value'; limit: number }

/** The first limit the cart breaks, or null. */
export const checkLimits = (
  lines: Line[],
  subtotal: number,
  l: OrderLimits,
): LimitBreach | null => {
  for (const x of lines) {
    if (x.min !== null && x.quantity < x.min)
      return { code: 'order.min_qty', productId: x.productId, limit: x.min }
    if (x.max !== null && x.quantity > x.max)
      return { code: 'order.max_qty', productId: x.productId, limit: x.max }
  }
  if (l.minOrder !== null && subtotal < l.minOrder)
    return { code: 'order.min_value', limit: l.minOrder }
  if (l.maxOrder !== null && subtotal > l.maxOrder)
    return { code: 'order.max_value', limit: l.maxOrder }
  return null
}
