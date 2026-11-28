import { describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import { trackingSchema } from '../domain/tracking'
import { createTracking, type ServerEvent } from './tracking'

const setup = (t: z.input<typeof trackingSchema>, found = true) => {
  const sent: ServerEvent[] = []
  const tracking = createTracking({
    settings: async () => ({ tracking: trackingSchema.parse(t), currency: 'BDT' }),
    order: async () =>
      found
        ? {
            orderNo: 1042,
            total: 50000,
            phone: '01712345678',
            email: ' A@B.com ',
            items: [
              { productId: 'p1', quantity: 1, unitPrice: 50000 },
              { productId: null, quantity: 1, unitPrice: 0 },
            ],
          }
        : null,
    open: (s) => s.replace('enc:', ''),
    sha256: (s) => `h(${s})`,
    send: vi.fn(async (e: ServerEvent) => void sent.push(e)),
    now: () => new Date('2026-11-26T00:00:00Z'),
  })
  return { tracking, sent }
}

describe('server purchase events (H1, H2)', () => {
  it('sends to every Meta pixel and TikTok on the chosen trigger only', async () => {
    const { tracking, sent } = setup({
      meta: { pixelIds: ['1111111111', '2222222222'], capiToken: 'enc:tok', testCode: 'TEST1' },
      tiktok: { pixelId: 'CABC', token: 'enc:tt', trigger: 'confirmed' },
    })
    await tracking.onOrderEvent('placed', { storeId: 's', orderId: 'o1' })
    expect(sent).toEqual([])
    await tracking.onOrderEvent('confirmed', { storeId: 's', orderId: 'o1' })
    expect(sent.map((e) => [e.platform, e.url])).toEqual([
      ['meta', 'https://graph.facebook.com/v21.0/1111111111/events'],
      ['meta', 'https://graph.facebook.com/v21.0/2222222222/events'],
      ['tiktok', 'https://business-api.tiktok.com/open_api/v1.3/event/track/'],
    ])
    expect(sent[0]!.body).toMatchObject({
      access_token: 'tok',
      test_event_code: 'TEST1',
      data: [
        {
          event_id: 'order-1042',
          user_data: { ph: ['h(8801712345678)'], em: ['h(a@b.com)'] },
          custom_data: { content_ids: ['p1', 'deleted'] },
        },
      ],
    })
    expect(sent[2]).toMatchObject({
      headers: { 'Access-Token': 'tt' },
      body: { event_source_id: 'CABC' },
    })
  })

  it('no test code, only TikTok, or an order that is gone', async () => {
    const one = setup({ meta: { pixelIds: ['1111111111'], capiToken: 'enc:tok' } })
    await one.tracking.onOrderEvent('confirmed', { storeId: 's', orderId: 'o1' })
    expect(one.sent[0]!.body).not.toHaveProperty('test_event_code')
    const tt = setup({ tiktok: { pixelId: 'CABC', token: 'enc:tt', trigger: 'delivered' } })
    await tt.tracking.onOrderEvent('delivered', { storeId: 's', orderId: 'o1' })
    expect(tt.sent.map((e) => e.platform)).toEqual(['tiktok'])
    const gone = setup({ meta: { pixelIds: ['1111111111'], capiToken: 'enc:tok' } }, false)
    await gone.tracking.onOrderEvent('confirmed', { storeId: 's', orderId: 'o1' })
    expect(gone.sent).toEqual([])
  })
})
