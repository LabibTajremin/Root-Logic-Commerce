import type { FeatureId } from '@/modules/plans'
import type { Business } from '@/modules/site-settings'

/**
 * The checkout rules the orders service needs, from the shop's settings. Combos and the
 * flash sale count only while their (paid) modules are on.
 */
export const shopRulesOf = (b: Business, on: (id: FeatureId) => boolean) => ({
  zones: b.deliveryZones,
  freeShipping: b.freeShipping,
  limits: b.orderLimits,
  combos: on('combos') ? b.combos : [],
  flash: on('flashSales') ? b.flashSale : null,
})

/** For admin actions: the store's switched-on modules as a check. */
export const activeModules = (list: { id: FeatureId; active: boolean }[]) => (id: FeatureId) =>
  list.some((f) => f.id === id && f.active)
