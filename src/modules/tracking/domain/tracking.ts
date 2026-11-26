import { z } from 'zod'
import { eventNames } from './events'

export const purchaseTriggers = ['placed', 'confirmed', 'delivered'] as const
export type PurchaseTrigger = (typeof purchaseTriggers)[number]
export const metaSenders = ['site', 'gtm_server', 'gtm'] as const
export type MetaSender = (typeof metaSenders)[number]

const id = (re: RegExp, max = 40) => z.string().trim().max(max).regex(re).default('')

/** H1/H2/H3: the shop's ad pixels and tags. Server tokens are stored sealed. */
export const trackingSchema = z.object({
  meta: z
    .object({
      pixelIds: z
        .array(z.string().regex(/^\d{8,20}$/))
        .max(5)
        .default([]),
      // Who sends events: this website (browser + server, same event_id), GTM + our server, or GTM only.
      sender: z.enum(metaSenders).default('site'),
      trigger: z.enum(purchaseTriggers).default('confirmed'),
      capiToken: z.string().max(1000).default(''),
      testCode: id(/^[A-Z0-9]*$/),
      domainVerification: id(/^[a-z0-9]*$/, 64),
    })
    .prefault({}),
  tiktok: z
    .object({
      pixelId: id(/^[A-Z0-9]*$/),
      token: z.string().max(1000).default(''),
      trigger: z.enum(purchaseTriggers).default('confirmed'),
    })
    .prefault({}),
  gtm: id(/^(GTM-[A-Z0-9]{4,})?$/),
  ga4Extra: z
    .array(z.string().regex(/^G-[A-Z0-9]{4,}$/))
    .max(3)
    .default([]),
  clarity: id(/^[a-z0-9]*$/, 20),
  searchConsole: id(/^[\w-]*$/, 100),
})
export type Tracking = z.infer<typeof trackingSchema>

export { eventNames, type TrackEvent } from './events'

/** Browser and server send the same id for one purchase (by order number), so it counts once. */
export const purchaseEventId = (orderNo: number) => `order-${orderNo}`

/**
 * What each platform gets and from where. Without a server token the browser sends Purchase
 * when the order is placed (the only moment it can); with one, the server sends it on the trigger.
 */
export const trackingPlan = (t: Tracking) => {
  const m = t.meta
  const metaBrowser = m.sender === 'site' && m.pixelIds.length > 0
  const metaServer = m.sender !== 'gtm' && m.pixelIds.length > 0 && !!m.capiToken
  const tiktokBrowser = !!t.tiktok.pixelId
  const tiktokServer = tiktokBrowser && !!t.tiktok.token
  return {
    metaPixels: metaBrowser ? m.pixelIds : [],
    metaServer: metaServer ? m.trigger : null,
    metaBrowserPurchase: metaBrowser && (!metaServer || m.trigger === 'placed'),
    // Owner warning: Purchase only fires on placed until a CAPI token is added.
    metaFallback: metaBrowser && !metaServer && m.trigger !== 'placed',
    tiktokPixel: tiktokBrowser ? t.tiktok.pixelId : null,
    tiktokServer: tiktokServer ? t.tiktok.trigger : null,
    tiktokBrowserPurchase: tiktokBrowser && (!tiktokServer || t.tiktok.trigger === 'placed'),
  }
}
export type TrackingPlan = ReturnType<typeof trackingPlan>

/** What a server purchase event says about the order (phone/email already hashed). */
export type PurchaseFacts = {
  orderNo: number
  value: number
  currency: string
  items: { id: string; quantity: number; price: number }[]
  phoneHash: string
  emailHash: string | null
}

const money = (minor: number) => Math.round(minor) / 100

/** H1: one Conversions API event (https://developers.facebook.com/docs/marketing-api/conversions-api). */
export const metaPurchase = (p: PurchaseFacts, at: Date) => ({
  event_name: 'Purchase',
  event_time: Math.floor(at.getTime() / 1000),
  event_id: purchaseEventId(p.orderNo),
  action_source: 'website',
  user_data: { ph: [p.phoneHash], ...(p.emailHash && { em: [p.emailHash] }) },
  custom_data: {
    currency: p.currency,
    value: money(p.value),
    content_type: 'product',
    content_ids: p.items.map((i) => i.id),
    contents: p.items.map((i) => ({ id: i.id, quantity: i.quantity, item_price: money(i.price) })),
    num_items: p.items.reduce((n, i) => n + i.quantity, 0),
  },
})

/** H2: one TikTok Events API event (event_id matches the pixel's). */
export const tiktokPurchase = (p: PurchaseFacts, at: Date) => ({
  event: 'CompletePayment',
  event_time: Math.floor(at.getTime() / 1000),
  event_id: purchaseEventId(p.orderNo),
  user: { phone: p.phoneHash, ...(p.emailHash && { email: p.emailHash }) },
  properties: {
    currency: p.currency,
    value: money(p.value),
    content_type: 'product',
    contents: p.items.map((i) => ({
      content_id: i.id,
      quantity: i.quantity,
      price: money(i.price),
    })),
  },
})

/** Phones are hashed as E.164 digits (8801XXXXXXXXX), emails trimmed and lower-cased. */
export const normalizeForHash = {
  phone: (bd: string) => `88${bd}`,
  email: (e: string) => e.trim().toLowerCase(),
}

/**
 * H3: an importable GTM container (Admin › Import container) with a trigger for each event the
 * shop pushes to the dataLayer and variables for its value, currency, items and event id.
 */
export const gtmContainer = (gtmId: string, at: Date) => {
  const events = Object.keys(eventNames)
  const variable = (n: number, name: string, path: string) => ({
    variableId: String(n),
    name,
    type: 'v',
    parameter: [
      { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
      { type: 'TEMPLATE', key: 'name', value: path },
    ],
  })
  return {
    exportFormatVersion: 2,
    exportTime: at.toISOString().slice(0, 19).replace('T', ' '),
    containerVersion: {
      container: { publicId: gtmId, usageContext: ['WEB'] },
      trigger: events.map((e, i) => ({
        triggerId: String(i + 1),
        name: `RLC - ${e}`,
        type: 'CUSTOM_EVENT',
        customEventFilter: [
          {
            type: 'EQUALS',
            parameter: [
              { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
              { type: 'TEMPLATE', key: 'arg1', value: e },
            ],
          },
        ],
      })),
      variable: [
        variable(1, 'RLC - value', 'ecommerce.value'),
        variable(2, 'RLC - currency', 'ecommerce.currency'),
        variable(3, 'RLC - items', 'ecommerce.items'),
        variable(4, 'RLC - event id', 'event_id'),
      ],
    },
  }
}
