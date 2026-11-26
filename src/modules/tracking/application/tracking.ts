import {
  metaPurchase,
  normalizeForHash,
  tiktokPurchase,
  trackingPlan,
  type PurchaseFacts,
  type PurchaseTrigger,
  type Tracking,
} from '../domain/tracking'

/** One server-to-server event request (Graph API or TikTok Events API). */
export type ServerEvent = {
  platform: 'meta' | 'tiktok'
  url: string
  headers: Record<string, string>
  body: unknown
}

type Deps = {
  settings(storeId: string): Promise<{ tracking: Tracking; currency: string }>
  order(
    storeId: string,
    id: string,
  ): Promise<{
    orderNo: number
    total: number
    phone: string
    email: string | null
    items: { productId: string | null; quantity: number; unitPrice: number }[]
  } | null>
  /** Opens a sealed token from settings. */
  open(sealed: string): string
  sha256(s: string): string
  send(e: ServerEvent): Promise<void>
  now(): Date
}

export const createTracking = ({ settings, order, open, sha256, send, now }: Deps) => ({
  /** H1/H2: on the shop's chosen trigger, tell Meta / TikTok about the purchase from the server. */
  async onOrderEvent(status: PurchaseTrigger, e: { storeId: string; orderId: string }) {
    const { tracking: t, currency } = await settings(e.storeId)
    const plan = trackingPlan(t)
    const meta = plan.metaServer === status
    const tiktok = plan.tiktokServer === status
    if (!meta && !tiktok) return
    const o = await order(e.storeId, e.orderId)
    if (!o) return
    const facts: PurchaseFacts = {
      orderNo: o.orderNo,
      value: o.total,
      currency,
      items: o.items.map((i) => ({
        id: i.productId ?? 'deleted',
        quantity: i.quantity,
        price: i.unitPrice,
      })),
      phoneHash: sha256(normalizeForHash.phone(o.phone)),
      emailHash: o.email && sha256(normalizeForHash.email(o.email)),
    }
    const at = now()
    if (meta)
      for (const pixel of t.meta.pixelIds)
        await send({
          platform: 'meta',
          url: `https://graph.facebook.com/v21.0/${pixel}/events`,
          headers: {},
          body: {
            data: [metaPurchase(facts, at)],
            access_token: open(t.meta.capiToken),
            ...(t.meta.testCode && { test_event_code: t.meta.testCode }),
          },
        })
    if (tiktok)
      await send({
        platform: 'tiktok',
        url: 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
        headers: { 'Access-Token': open(t.tiktok.token) },
        body: {
          event_source: 'web',
          event_source_id: t.tiktok.pixelId,
          data: [tiktokPurchase(facts, at)],
        },
      })
  },
})
export type TrackingService = ReturnType<typeof createTracking>
