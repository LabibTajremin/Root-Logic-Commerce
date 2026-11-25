import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderDetail, OrderStatus } from '@/modules/orders'
import { createCourier, type CourierRepo, type Shipment } from './courier'

const order = (o: Partial<OrderDetail> = {}) =>
  ({
    id: 'o1',
    orderNo: 1042,
    status: 'CONFIRMED',
    total: 125000,
    shipName: 'Rumana',
    shipPhone: '01712345678',
    shipAddress: 'House 4, Road 2',
    shipArea: 'Mirpur 10',
    shipDistrict: 'Dhaka',
    paymentStatus: 'unpaid',
    note: null,
    ...o,
  }) as OrderDetail

const setup = (o: OrderDetail | null = order()) => {
  const shipments: Shipment[] = []
  const accounts: { id: string; provider: 'steadfast'; sealed: string; isDefault: boolean }[] = []
  let current = o
  const repo: CourierRepo = {
    addAccount: async (_s, a) => {
      accounts.push({
        id: `a${accounts.length + 1}`,
        provider: 'steadfast',
        sealed: a.sealed,
        isDefault: accounts.length === 0,
      })
      return `a${accounts.length}`
    },
    listAccounts: async () =>
      accounts.map((a) => ({ ...a, label: 'Main', webhookToken: 'tok', createdAt: new Date() })),
    removeAccount: vi.fn(async () => {}),
    setDefault: vi.fn(async () => {}),
    sealed: async (_s, id) => accounts.find((a) => a.id === id) ?? null,
    accountByToken: async (t) =>
      t === 'tok' ? { id: 'a1', storeId: 's1', provider: 'steadfast' } : null,
    addShipment: async (storeId, s) => {
      const row = {
        ...s,
        id: `sh${shipments.length + 1}`,
        storeId,
        codCollected: null,
        paidOutAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      shipments.push(row)
      return row
    },
    shipmentForOrder: async (_s, id) => shipments.find((s) => s.orderId === id) ?? null,
    shipmentByRef: async (_a, ref) => shipments.find((s) => s.ref === ref) ?? null,
    updateShipment: vi.fn(async (_s, id, u) => {
      Object.assign(
        shipments.find((s) => s.id === id)!,
        u,
      )
    }),
    staleShipments: async () => shipments,
    parcelFacts: vi.fn(async () => shipments),
    unsettled: async () => shipments.map((s) => ({ ...s, orderNo: 1042 })),
    setAmounts: vi.fn(async () => {}),
    markPaid: vi.fn(async (_s, ids) => ids.length),
    chargesSince: async () => 6000,
  }
  const api = {
    create: vi.fn(async () => ({ ref: '77', tracking: 'SF77', charge: 6000 })),
    status: vi.fn(async () => 'delivered'),
  }
  const changes: [OrderStatus, string | null][] = []
  const courier = createCourier({
    repo,
    api: () => api,
    box: { seal: (s) => `sealed:${s}`, open: (s) => s.slice(7) },
    orders: {
      getOrder: async () => current,
      changeStatus: async (_s, _id, to, _a, note) => {
        changes.push([to, note ?? null])
        current = current && { ...current, status: to }
      },
    },
    token: () => 'tok',
    now: () => new Date('2026-11-25T10:00:00Z'),
  })
  return { courier, api, repo, shipments, changes, set: (x: OrderDetail | null) => (current = x) }
}

describe('courier (E1, E2)', () => {
  let t: ReturnType<typeof setup>
  beforeEach(() => {
    t = setup()
  })

  it('keeps courier keys sealed and refuses incomplete ones', async () => {
    await expect(
      t.courier.addAccount('s1', {
        provider: 'steadfast',
        label: 'Main',
        credentials: { apiKey: 'k' },
      }),
    ).rejects.toThrow()
    await t.courier.addAccount('s1', {
      provider: 'steadfast',
      label: 'Main',
      credentials: { apiKey: 'k', secretKey: 's' },
    })
    expect((await t.repo.sealed('s1', 'a1'))!.sealed).toBe('sealed:{"apiKey":"k","secretKey":"s"}')
    expect((await t.courier.listAccounts('s1'))[0]!.isDefault).toBe(true)
    await t.courier.setDefault('s1', 'a1')
    await t.courier.removeAccount('s1', 'a1')
    expect(t.repo.setDefault).toHaveBeenCalled()
    expect(t.repo.removeAccount).toHaveBeenCalled()
  })

  it('sends a confirmed order with the due amount, then the order is shipped', async () => {
    await expect(t.courier.send('s1', 'o1', null, 'u1')).rejects.toThrow('courier.no_account')
    await expect(t.courier.send('s1', 'o1', 'a9', 'u1')).rejects.toThrow(
      'courier.account_not_found',
    )
    await t.courier.addAccount('s1', {
      provider: 'steadfast',
      label: 'Main',
      credentials: { apiKey: 'k', secretKey: 's' },
    })
    const s = await t.courier.send('s1', 'o1', null, 'u1')
    expect(t.api.create).toHaveBeenCalledWith({
      invoice: '1042',
      name: 'Rumana',
      phone: '01712345678',
      address: 'House 4, Road 2, Mirpur 10, Dhaka',
      district: 'Dhaka',
      cod: 125000,
      note: '',
    })
    expect(s).toMatchObject({ ref: '77', tracking: 'SF77', charge: 6000, state: 'pending' })
    expect(t.changes).toEqual([
      ['PROCESSING', 'courier: Steadfast SF77'],
      ['SHIPPED', 'courier: Steadfast SF77'],
    ])
    expect(await t.courier.shipmentFor('s1', 'o1')).toBe(s)
    t.set(order({ status: 'PROCESSING' }))
    await expect(t.courier.send('s1', 'o1', null, 'u1')).rejects.toThrow('courier.already_sent')
  })

  it('a paid or processing order goes out with nothing to collect and one status move', async () => {
    await t.courier.addAccount('s1', {
      provider: 'steadfast',
      label: 'Main',
      credentials: { apiKey: 'k', secretKey: 's' },
    })
    t.set(order({ status: 'PROCESSING', paymentStatus: 'paid', shipArea: '', note: 'Call first' }))
    await t.courier.send('s1', 'o1', 'a1', null)
    expect(t.api.create).toHaveBeenCalledWith(
      expect.objectContaining({ cod: 0, note: 'Call first', address: 'House 4, Road 2, Dhaka' }),
    )
    expect(t.changes.map((c) => c[0])).toEqual(['SHIPPED'])
  })

  it('a courier refusing the parcel leaves the order as it was', async () => {
    await t.courier.addAccount('s1', {
      provider: 'steadfast',
      label: 'Main',
      credentials: { apiKey: 'k', secretKey: 's' },
    })
    t.api.create.mockRejectedValueOnce(new Error('portal.packzy.com answered 401'))
    await expect(t.courier.send('s1', 'o1', null, null)).rejects.toThrow('courier.refused')
    expect(t.changes).toEqual([])
    expect(t.shipments).toEqual([])
  })

  it('refuses orders that are missing or not confirmed', async () => {
    t.set(null)
    await expect(t.courier.send('s1', 'o1', null, null)).rejects.toThrow('order.not_found')
    t.set(order({ status: 'PENDING' }))
    await expect(t.courier.send('s1', 'o1', null, null)).rejects.toThrow('courier.not_ready')
  })

  it('webhooks move the order when the move is allowed, and only then', async () => {
    await t.courier.addAccount('s1', {
      provider: 'steadfast',
      label: 'Main',
      credentials: { apiKey: 'k', secretKey: 's' },
    })
    await t.courier.send('s1', 'o1', null, null)
    t.changes.length = 0
    expect(await t.courier.webhook('nope', {})).toBeNull()
    expect(await t.courier.webhook('tok', { notification_type: 'x' })).toBe(false)
    expect(await t.courier.webhook('tok', { consignment_id: 'zz', status: 'hold' })).toBe(false)
    // Hold, then delivered with the charge the courier billed.
    expect(await t.courier.webhook('tok', { consignment_id: 77, status: 'hold' })).toBe(true)
    expect(
      await t.courier.webhook('tok', {
        consignment_id: 77,
        status: 'delivered',
        delivery_charge: 65,
      }),
    ).toBe(true)
    expect(t.changes).toEqual([
      ['COURIER_HOLD', 'courier: hold'],
      ['DELIVERED', 'courier: delivered'],
    ])
    expect(t.shipments[0]).toMatchObject({ state: 'delivered', charge: 6500 })
    // Same status again, a move the order can't make, a state with no order move, a gone order.
    await t.courier.webhook('tok', { consignment_id: 77, status: 'delivered' })
    await t.courier.webhook('tok', { consignment_id: 77, status: 'hold' })
    await t.courier.webhook('tok', { consignment_id: 77, status: 'pending' })
    t.set(null)
    await t.courier.webhook('tok', { consignment_id: 77, status: 'hold' })
    expect(t.changes).toHaveLength(2)
    expect(t.shipments[0]!.charge).toBe(6500)
  })

  it('reports per courier, totals what couriers owe, records amounts and payouts (E3, E5)', async () => {
    await t.courier.addAccount('s1', {
      provider: 'steadfast',
      label: 'Main',
      credentials: { apiKey: 'k', secretKey: 's' },
    })
    await t.courier.send('s1', 'o1', null, null)
    await t.courier.webhook('tok', { consignment_id: 77, status: 'delivered' })
    expect(await t.courier.report('s1')).toMatchObject([
      { provider: 'steadfast', sent: 1, delivered: 1, successPct: 100 },
    ])
    expect(t.repo.parcelFacts).toHaveBeenCalledWith('s1', {})
    expect(await t.courier.unsettled('s1')).toMatchObject({
      rows: [{ orderNo: 1042, collected: 125000 }],
      collected: 125000,
      charges: 6000,
      due: 119000,
    })
    t.shipments[0]!.charge = null
    expect((await t.courier.unsettled('s1')).charges).toBe(0)
    await expect(t.courier.setAmounts('s1', 'sh1', { collected: -5, charge: 0 })).rejects.toThrow(
      'validation',
    )
    await t.courier.setAmounts('s1', 'sh1', { collected: 100000, charge: 7000 })
    expect(t.repo.setAmounts).toHaveBeenCalledWith('s1', 'sh1', { collected: 100000, charge: 7000 })
    expect(await t.courier.markPaid('s1', ['sh1'])).toBe(1)
    expect(t.repo.markPaid).toHaveBeenCalledWith('s1', ['sh1'], new Date('2026-11-25T10:00:00Z'))
    expect(await t.courier.chargesSince('s1', new Date(0))).toBe(6000)
  })

  it('polls quiet parcels and counts the ones the courier could not answer', async () => {
    await t.courier.addAccount('s1', {
      provider: 'steadfast',
      label: 'Main',
      credentials: { apiKey: 'k', secretKey: 's' },
    })
    await t.courier.send('s1', 'o1', null, null)
    t.changes.length = 0
    expect(await t.courier.sync()).toEqual({ checked: 1, failed: 0 })
    expect(t.changes).toEqual([['DELIVERED', 'courier: delivered']])
    t.api.status.mockRejectedValueOnce(new Error('timeout'))
    expect(await t.courier.sync(10)).toEqual({ checked: 1, failed: 1 })
  })
})
