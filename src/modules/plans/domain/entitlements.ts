export const entitlementIds = [
  'removeBranding',
  'ga4InAdmin',
  'seoPro',
  'customDomain',
  'extraThemes',
  'videoUploads',
] as const
export type EntitlementId = (typeof entitlementIds)[number]

export const isEntitlement = (s: string): s is EntitlementId =>
  (entitlementIds as readonly string[]).includes(s)

// Locked features stay visible in admin (spec §5.10) — callers render a lock badge instead of hiding.
export const featureStates = (owned: ReadonlySet<EntitlementId>) =>
  entitlementIds.map((id) => ({ id, unlocked: owned.has(id) }))
