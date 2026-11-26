import { describe, expect, it } from 'vitest'
import {
  gtmContainer,
  metaPurchase,
  tiktokPurchase,
  trackingPlan,
  trackingSchema,
} from './tracking'

const base = trackingSchema.parse({})
const meta = (m: Partial<typeof base.meta>) => ({ ...base, meta: { ...base.meta, ...m } })

describe('tracking plan (H1, H2)', () => {
  it('nothing set means nothing loads or sends', () => {
    expect(trackingPlan(base)).toEqual({
      metaPixels: [],
      metaServer: null,
      metaBrowserPurchase: false,
      metaFallback: false,
      tiktokPixel: null,
      tiktokServer: null,
      tiktokBrowserPurchase: false,
    })
  })

  it('without a token the browser sends Purchase on placed, and the owner is warned', () => {
    expect(trackingPlan(meta({ pixelIds: ['1234567890'] }))).toMatchObject({
      metaPixels: ['1234567890'],
      metaServer: null,
      metaBrowserPurchase: true,
      metaFallback: true,
    })
  })

  it('with a token the server sends on the trigger; placed sends from both with one id', () => {
    const t = meta({ pixelIds: ['1234567890'], capiToken: 'enc' })
    expect(trackingPlan(t)).toMatchObject({
      metaServer: 'confirmed',
      metaBrowserPurchase: false,
      metaFallback: false,
    })
    expect(
      trackingPlan(meta({ pixelIds: ['1234567890'], capiToken: 'enc', trigger: 'placed' })),
    ).toMatchObject({
      metaServer: 'placed',
      metaBrowserPurchase: true,
    })
    // GTM in the browser: no pixel script from us, the server still sends.
    expect(trackingPlan({ ...t, meta: { ...t.meta, sender: 'gtm_server' } })).toMatchObject({
      metaPixels: [],
      metaServer: 'confirmed',
      metaBrowserPurchase: false,
      metaFallback: false,
    })
    expect(trackingPlan({ ...t, meta: { ...t.meta, sender: 'gtm' } })).toMatchObject({
      metaServer: null,
    })
  })

  it('TikTok follows the same rules', () => {
    const tt = { ...base, tiktok: { pixelId: 'C123ABC', token: '', trigger: 'delivered' as const } }
    expect(trackingPlan(tt)).toMatchObject({
      tiktokPixel: 'C123ABC',
      tiktokServer: null,
      tiktokBrowserPurchase: true,
    })
    expect(trackingPlan({ ...tt, tiktok: { ...tt.tiktok, token: 'enc' } })).toMatchObject({
      tiktokServer: 'delivered',
      tiktokBrowserPurchase: false,
    })
  })

  it('rejects ids that could break out of a script', () => {
    expect(trackingSchema.safeParse({ gtm: 'GTM-1;alert(1)' }).success).toBe(false)
    expect(trackingSchema.safeParse({ meta: { pixelIds: ['12x'] } }).success).toBe(false)
    expect(trackingSchema.safeParse({ clarity: '"><' }).success).toBe(false)
  })
})

describe('purchase events (H1, H2)', () => {
  const facts = {
    orderNo: 1042,
    value: 125050,
    currency: 'BDT',
    items: [{ id: 'p1', quantity: 2, price: 50000 }],
    phoneHash: 'ph',
    emailHash: null,
  }
  const at = new Date('2026-11-26T00:00:00Z')
  it('Meta gets hashed contact, value in taka and the shared event id', () => {
    expect(metaPurchase(facts, at)).toEqual({
      event_name: 'Purchase',
      event_time: 1795651200,
      event_id: 'order-1042',
      action_source: 'website',
      user_data: { ph: ['ph'] },
      custom_data: {
        currency: 'BDT',
        value: 1250.5,
        content_type: 'product',
        content_ids: ['p1'],
        contents: [{ id: 'p1', quantity: 2, item_price: 500 }],
        num_items: 2,
      },
    })
    expect(metaPurchase({ ...facts, emailHash: 'em' }, at).user_data).toEqual({
      ph: ['ph'],
      em: ['em'],
    })
  })
  it('TikTok gets CompletePayment with the same id', () => {
    expect(tiktokPurchase(facts, at)).toMatchObject({
      event: 'CompletePayment',
      event_id: 'order-1042',
      user: { phone: 'ph' },
      properties: { value: 1250.5, contents: [{ content_id: 'p1', quantity: 2, price: 500 }] },
    })
    expect(tiktokPurchase({ ...facts, emailHash: 'em' }, at).user).toEqual({
      phone: 'ph',
      email: 'em',
    })
  })
})

describe('GTM container (H3)', () => {
  it('has a trigger per dataLayer event and the variables our events carry', () => {
    const c = gtmContainer('GTM-AB12CD', new Date('2026-11-26T08:30:00Z'))
    expect(c).toMatchObject({
      exportFormatVersion: 2,
      exportTime: '2026-11-26 08:30:00',
      containerVersion: { container: { publicId: 'GTM-AB12CD' } },
    })
    expect(c.containerVersion.trigger.map((x) => x.name)).toEqual([
      'RLC - view_item',
      'RLC - add_to_cart',
      'RLC - begin_checkout',
      'RLC - purchase',
      'RLC - search',
      'RLC - contact',
      'RLC - generate_lead',
    ])
    expect(c.containerVersion.variable.map((v) => v.parameter[1]!.value)).toEqual([
      'ecommerce.value',
      'ecommerce.currency',
      'ecommerce.items',
      'event_id',
    ])
  })
})
