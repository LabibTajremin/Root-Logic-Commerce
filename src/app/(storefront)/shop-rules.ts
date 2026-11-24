import type { Business } from '@/modules/site-settings'

/** The checkout rules the orders service needs, from the shop's settings. */
export const shopRulesOf = (b: Business) => ({
  zones: b.deliveryZones,
  freeShipping: b.freeShipping,
  limits: b.orderLimits,
})
