import { describe, expect, it } from 'vitest'
import { createMessaging } from './messaging'
import type { OutboxRepo, OutboxRow, SavedTemplateRow, StoreFacts } from './ports'

const setup = (store: Partial<StoreFacts> = {}, fail: (to: string) => boolean = () => false) => {
  const rows: (OutboxRow & {
    status: string
    next: number
    dedupeKey: string
    lastError: string | null
  })[] = []
  const saved: SavedTemplateRow[] = []
  let clock = 1_000_000
  const repo: OutboxRepo = {
    enqueue: async (storeId, m) => {
      if (rows.some((r) => r.storeId === storeId && r.dedupeKey === m.dedupeKey)) return
      rows.push({
        ...m,
        id: String(rows.length),
        storeId,
        attempts: 0,
        status: 'pending',
        next: clock,
        lastError: null,
      })
    },
    claimDue: async (now, limit) =>
      rows.filter((r) => r.status === 'pending' && r.next <= now.getTime()).slice(0, limit),
    markSent: async (id) => void (rows[Number(id)]!.status = 'sent'),
    markRetry: async (id, attempts, at, error) =>
      void Object.assign(rows[Number(id)]!, { attempts, next: at.getTime(), lastError: error }),
    markFailed: async (id, attempts, error) =>
      void Object.assign(rows[Number(id)]!, { attempts, status: 'failed', lastError: error }),
    templates: async () => saved,
    saveTemplate: async (_s, t) => void saved.push(t),
    recent: async () => [],
  }
  const sent: string[] = []
  const m = createMessaging({
    repo,
    order: async (_s, id) =>
      id === 'gone'
        ? null
        : {
            orderNo: 1001,
            total: '৳500',
            name: 'Rahim',
            phone: '01712345678',
            email: id === 'mail' ? 'r@x.test' : null,
          },
    store: async () => ({
      name: 'Ankito',
      locale: 'en',
      channels: { sms: true, email: true, whatsapp: false },
      ownerPhone: '01811111111',
      ownerEmail: '',
      ...store,
    }),
    deliver: async (_s, ch, to, text) => {
      if (fail(to)) throw new Error('gateway down')
      sent.push(`${ch}:${to}:${text}`)
    },
    now: () => new Date(clock),
  })
  return { m, rows, sent, saved, tick: (ms: number) => (clock += ms) }
}

describe('messaging', () => {
  it('queues a message per enabled channel with a recipient, once per event', async () => {
    const { m, rows } = setup()
    await m.onOrderEvent('order.placed', { storeId: 's', orderId: 'mail', orderNo: 1001 })
    await m.onOrderEvent('order.placed', { storeId: 's', orderId: 'mail', orderNo: 1001 })
    expect(rows.map((r) => `${r.channel}:${r.recipient}`)).toEqual([
      'email:r@x.test',
      'sms:01712345678',
      'sms:01811111111',
    ])
    expect(rows[1]!.body).toBe('Ankito: we got your order #1001 (৳500). We will call to confirm.')
    expect(rows[2]!.body).toContain('New order #1001')
  })

  it('skips disabled templates, missing orders and owner alerts without contacts', async () => {
    const { m, rows, saved } = setup({ ownerPhone: '', locale: 'bn' })
    await m.onOrderEvent('order.shipped', { storeId: 's', orderId: 'gone', orderNo: 1 })
    saved.push({
      event: 'order.confirmed',
      channel: 'sms',
      locale: 'bn',
      body: 'x',
      enabled: false,
    })
    await m.onOrderEvent('order.confirmed', { storeId: 's', orderId: 'o', orderNo: 1001 })
    await m.onOrderEvent('order.placed', { storeId: 's', orderId: 'o', orderNo: 1001 })
    expect(rows.map((r) => r.body)).toEqual([
      'Ankito: আপনার অর্ডার #1001 (৳500) পেয়েছি। কনফার্ম করতে কল করব।',
    ])
  })

  it('sends due messages, retries failures with backoff, then gives up', async () => {
    const { m, rows, sent, tick } = setup({}, (to) => to === '01811111111')
    await m.onOrderEvent('order.placed', { storeId: 's', orderId: 'o', orderNo: 1001 })
    expect(await m.processDue()).toEqual({ sent: 1, failed: 1 })
    expect(sent).toHaveLength(1)
    expect(rows[1]).toMatchObject({ status: 'pending', attempts: 1, lastError: 'gateway down' })
    expect(await m.processDue()).toEqual({ sent: 0, failed: 0 })
    for (let i = 0; i < 8; i++) {
      tick(6 * 3600_000)
      await m.processDue()
    }
    expect(rows[1]).toMatchObject({ status: 'failed', attempts: 8 })
  })

  it('saves and lists templates', async () => {
    const { m } = setup()
    await m.saveTemplate('s', {
      event: 'order.placed',
      channel: 'sms',
      locale: 'en',
      body: 'Hi {{orderNo}}',
      enabled: true,
    })
    expect(await m.templates('s')).toHaveLength(1)
    expect(await m.recent('s')).toEqual([])
  })
})
