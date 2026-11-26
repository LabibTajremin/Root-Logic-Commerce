/** Our event names → each platform's own. */
export const eventNames = {
  view_item: { meta: 'ViewContent', tiktok: 'ViewContent' },
  add_to_cart: { meta: 'AddToCart', tiktok: 'AddToCart' },
  begin_checkout: { meta: 'InitiateCheckout', tiktok: 'InitiateCheckout' },
  purchase: { meta: 'Purchase', tiktok: 'CompletePayment' },
  search: { meta: 'Search', tiktok: 'Search' },
  contact: { meta: 'Contact', tiktok: 'Contact' },
  generate_lead: { meta: 'Lead', tiktok: 'SubmitForm' },
} as const
export type TrackEvent = keyof typeof eventNames
