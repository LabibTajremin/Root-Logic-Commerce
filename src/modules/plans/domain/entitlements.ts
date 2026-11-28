export const entitlementIds = [
  'removeBranding',
  'ga4InAdmin',
  'seoPro',
  'customDomain',
  'extraThemes',
  'videoUploads',
  // Paid modules (feature toggles, J5) — the entitlement unlocks the feature of the same id.
  'reels',
  'socialProof',
  'popups',
  'blog',
  'combos',
  'flashSales',
  'preOrder',
  'backInStock',
  'giftCards',
  'rewardPoints',
  'onlinePayments',
  'courier',
  'fraudCheck',
  'autoAssign',
  'reports',
  'purchases',
  'pos',
  'office',
  'autoCall',
  'landingPages',
  'campaigns',
  'reorderReminders',
  'reviewRequests',
  'affiliates',
  'pixelReport',
  'pwa',
  'aiChat',
  'aiImage',
  'aiImagePro',
  'aiAdmin',
  'aiVoice',
] as const
export type EntitlementId = (typeof entitlementIds)[number]

export const isEntitlement = (s: string): s is EntitlementId =>
  (entitlementIds as readonly string[]).includes(s)

// Locked features stay visible in admin (spec §5.10) — callers render a lock badge instead of hiding.
export const featureStates = (owned: ReadonlySet<EntitlementId>) =>
  entitlementIds.map((id) => ({ id, unlocked: owned.has(id) }))
