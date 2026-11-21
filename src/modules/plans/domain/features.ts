export const featureGroups = [
  'storefront',
  'sell',
  'orders',
  'operations',
  'marketing',
  'ai',
] as const
export type FeatureGroup = (typeof featureGroups)[number]

// Free modules default on (a fresh store should work out of the box); paid ones default off.
const free = <const I extends string>(id: I, group: FeatureGroup) =>
  ({ id, group, paid: false }) as const
const paid = <const I extends string>(id: I, group: FeatureGroup) =>
  ({ id, group, paid: true }) as const

export const featureCatalog = [
  free('announcement', 'storefront'),
  free('heroSlider', 'storefront'),
  free('helpBubble', 'storefront'),
  free('bottomNav', 'storefront'),
  free('miniCart', 'storefront'),
  free('trustBadges', 'storefront'),
  free('cmsPages', 'storefront'),
  free('wishlist', 'storefront'),
  paid('reels', 'storefront'),
  paid('socialProof', 'storefront'),
  paid('popups', 'storefront'),
  paid('blog', 'storefront'),
  free('brands', 'sell'),
  free('sizeCharts', 'sell'),
  free('reviews', 'sell'),
  free('coupons', 'sell'),
  paid('combos', 'sell'),
  paid('flashSales', 'sell'),
  paid('preOrder', 'sell'),
  paid('backInStock', 'sell'),
  paid('giftCards', 'sell'),
  paid('rewardPoints', 'sell'),
  free('incompleteOrders', 'orders'),
  paid('onlinePayments', 'orders'),
  paid('courier', 'orders'),
  paid('fraudCheck', 'orders'),
  paid('autoAssign', 'orders'),
  free('crm', 'operations'),
  free('followUps', 'operations'),
  free('expenses', 'operations'),
  free('profitCalculator', 'operations'),
  paid('reports', 'operations'),
  paid('purchases', 'operations'),
  paid('pos', 'operations'),
  paid('office', 'operations'),
  paid('autoCall', 'operations'),
  paid('landingPages', 'marketing'),
  paid('campaigns', 'marketing'),
  paid('reorderReminders', 'marketing'),
  paid('reviewRequests', 'marketing'),
  paid('affiliates', 'marketing'),
  paid('pixelReport', 'marketing'),
  paid('pwa', 'marketing'),
  paid('aiChat', 'ai'),
  paid('aiImage', 'ai'),
  paid('aiAdmin', 'ai'),
  paid('aiVoice', 'ai'),
] as const

export type FeatureId = (typeof featureCatalog)[number]['id']

export const isFeature = (s: string): s is FeatureId => featureCatalog.some((f) => f.id === s)

export type FeatureState = {
  id: FeatureId
  group: FeatureGroup
  paid: boolean
  enabled: boolean
  locked: boolean
  active: boolean
}

export const featureView = (
  stored: ReadonlyMap<string, boolean>,
  owned: ReadonlySet<string>,
): FeatureState[] =>
  featureCatalog.map((f) => {
    const enabled = stored.get(f.id) ?? !f.paid
    const locked = f.paid && !owned.has(f.id)
    return { id: f.id, group: f.group, paid: f.paid, enabled, locked, active: enabled && !locked }
  })
