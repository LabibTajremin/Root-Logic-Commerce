import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CourierRepo } from '@/modules/courier'
import { createCourierApis } from '@/infrastructure/courier/couriers'
import { createCourierRepo } from '@/infrastructure/db/repositories/courier-repo'
import { createOrdersRepo } from '@/infrastructure/db/repositories/orders-repo'
import {
  courierEvents,
  courierShipments,
  customers,
  orderItems,
  orders,
  products,
} from '@/infrastructure/db/schema'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

type TestDb = Awaited<ReturnType<typeof createTestDb>>
let db: TestDb, repo: CourierRepo, store: string, other: string

const order = async (s: string, orderNo = 1001) => {
  const [c] = await db
    .insert(customers)
    .values({ storeId: s, phone: `0171234${orderNo}`, name: 'Rumana' })
    .returning({ id: customers.id })
  return (
    await db
      .insert(orders)
      .values({
        storeId: s,
        customerId: c!.id,
        orderNo,
        subtotal: 100000,
        deliveryCharge: 6000,
        total: 106000,
        deliveryZone: 'dhaka',
        shipName: 'Rumana',
        shipPhone: '01712345678',
        shipAddress: 'House 4',
        shipArea: 'Mirpur',
        shipDistrict: 'Dhaka',
      })
      .returning({ id: orders.id })
  )[0]!.id
}

beforeEach(async () => {
  db = await createTestDb()
  repo = createCourierRepo(db)
  store = await seedStore(db)
  other = await seedStore(db, 'other')
})

describe('courier repository (E1, E2)', () => {
  it('the first account is the default; removing the default promotes the next', async () => {
    const a = await repo.addAccount(store, {
      provider: 'steadfast',
      label: 'Main',
      sealed: 'enc:a',
      webhookToken: 't1',
    })
    const b = await repo.addAccount(store, {
      provider: 'pathao',
      label: 'Outside Dhaka',
      sealed: 'enc:b',
      webhookToken: 't2',
    })
    await repo.addAccount(other, {
      provider: 'redx',
      label: 'X',
      sealed: 'enc:x',
      webhookToken: 't3',
    })
    expect((await repo.listAccounts(store)).map((x) => [x.label, x.isDefault])).toEqual([
      ['Main', true],
      ['Outside Dhaka', false],
    ])
    await repo.setDefault(store, b)
    expect((await repo.listAccounts(store)).map((x) => x.isDefault)).toEqual([false, true])
    expect(await repo.sealed(store, a)).toEqual({ provider: 'steadfast', sealed: 'enc:a' })
    expect(await repo.sealed(other, a)).toBeNull()
    expect(await repo.accountByToken('t2')).toEqual({ id: b, storeId: store, provider: 'pathao' })
    expect(await repo.accountByToken('nope')).toBeNull()
    await repo.removeAccount(store, b)
    expect((await repo.listAccounts(store)).map((x) => [x.id, x.isDefault])).toEqual([[a, true]])
    await repo.removeAccount(store, a)
    expect(await repo.listAccounts(store)).toEqual([])
  })

  it('keeps one parcel per order, its events, and finds the quiet ones', async () => {
    const acc = await repo.addAccount(store, {
      provider: 'steadfast',
      label: 'Main',
      sealed: 'enc:a',
      webhookToken: 't1',
    })
    const o1 = await order(store)
    const o2 = await order(store, 1002)
    const base = {
      accountId: acc,
      provider: 'steadfast' as const,
      tracking: 'SF77',
      cod: 106000,
      charge: null,
      rawStatus: 'pending',
      state: 'pending' as const,
    }
    const s = await repo.addShipment(store, { ...base, orderId: o1, ref: '77' })
    await expect(repo.addShipment(store, { ...base, orderId: o1, ref: '78' })).rejects.toThrow()
    await repo.addShipment(store, { ...base, orderId: o2, ref: '79', state: 'delivered' })
    expect((await repo.shipmentForOrder(store, o1))!.ref).toBe('77')
    // E2: order rows carry the parcel and the courier's own status word.
    const { rows } = await createOrdersRepo(db).list(store, {})
    expect(rows.map((r) => r.parcel)).toEqual([
      { provider: 'steadfast', tracking: 'SF77', rawStatus: 'pending' },
      { provider: 'steadfast', tracking: 'SF77', rawStatus: 'pending' },
    ])
    expect(await repo.shipmentForOrder(other, o1)).toBeNull()
    expect((await repo.shipmentByRef(acc, '77'))!.id).toBe(s.id)
    expect(await repo.shipmentByRef(acc, 'zz')).toBeNull()
    const later = new Date(Date.now() + 60_000)
    // Delivered parcels are done; only the moving one is asked about.
    expect((await repo.staleShipments(later, 10)).map((x) => x.ref)).toEqual(['77'])
    expect(await repo.staleShipments(new Date(0), 10)).toEqual([])
    await repo.updateShipment(store, s.id, {
      rawStatus: 'hold',
      state: 'hold',
      charge: 6000,
      payload: { status: 'hold' },
    })
    expect(await repo.shipmentForOrder(store, o1)).toMatchObject({ state: 'hold', charge: 6000 })
    expect(await db.select().from(courierEvents)).toMatchObject([
      {
        storeId: store,
        shipmentId: s.id,
        rawStatus: 'hold',
        state: 'hold',
        payload: { status: 'hold' },
      },
    ])
    // A removed account keeps its parcels, which are no longer polled.
    await repo.removeAccount(store, acc)
    expect((await db.select().from(courierShipments)).map((x) => x.accountId)).toEqual([null, null])
    expect(await repo.staleShipments(later, 10)).toEqual([])
  })
})

describe('courier report and payouts (E3, E5)', () => {
  it('filters the report by date and product; lists, edits and pays out delivered parcels', async () => {
    const acc = await repo.addAccount(store, {
      provider: 'redx',
      label: 'Main',
      sealed: 'enc:a',
      webhookToken: 't1',
    })
    const [p] = await db
      .insert(products)
      .values({ storeId: store, name: 'Kurta', slug: 'kurta', price: 100000 })
      .returning({ id: products.id })
    const ship = async (
      no: number,
      state: 'delivered' | 'partial' | 'pending',
      charge: number | null,
    ) => {
      const o = await order(store, no)
      if (no === 1)
        await db.insert(orderItems).values({
          orderId: o,
          productId: p!.id,
          name: 'Kurta',
          unitPrice: 100000,
          unitCost: 60000,
          quantity: 1,
        })
      return repo.addShipment(store, {
        orderId: o,
        accountId: acc,
        provider: 'redx',
        ref: `R${no}`,
        tracking: `R${no}`,
        cod: 106000,
        charge,
        rawStatus: state,
        state,
      })
    }
    const a = await ship(1, 'delivered', 6000)
    const b = await ship(2, 'partial', null)
    await ship(3, 'pending', 9000)
    const all = await repo.parcelFacts(store, {})
    expect(all.map((r) => r.state).sort()).toEqual(['delivered', 'partial', 'pending'])
    expect(await repo.parcelFacts(store, { productId: p!.id })).toMatchObject([
      { state: 'delivered' },
    ])
    expect(await repo.parcelFacts(store, { from: new Date(Date.now() + 60_000) })).toEqual([])
    expect(await repo.parcelFacts(store, { to: new Date(0) })).toEqual([])
    expect(await repo.parcelFacts(other, {})).toEqual([])

    expect((await repo.unsettled(store)).map((r) => [r.orderNo, r.state])).toEqual([
      [1, 'delivered'],
      [2, 'partial'],
    ])
    await repo.setAmounts(store, b.id, { collected: 50000, charge: 7000 })
    await repo.setAmounts(other, b.id, { collected: 1, charge: 1 })
    expect((await repo.unsettled(store))[1]).toMatchObject({ codCollected: 50000, charge: 7000 })
    expect(await repo.chargesSince(store, new Date(0))).toBe(6000 + 7000 + 9000)
    expect(await repo.chargesSince(other, new Date(0))).toBe(0)
    const now = new Date()
    expect(await repo.markPaid(store, [], now)).toBe(0)
    expect(await repo.markPaid(store, [a.id], now)).toBe(1)
    // Paid once only; another shop's ids do nothing.
    expect(await repo.markPaid(store, [a.id], now)).toBe(0)
    expect(await repo.markPaid(other, [b.id], now)).toBe(0)
    expect((await repo.unsettled(store)).map((r) => r.orderNo)).toEqual([2])
  })
})

const parcel = {
  invoice: '1042',
  name: 'Rumana',
  phone: '01712345678',
  address: 'House 4, Mirpur, Dhaka',
  district: 'Dhaka',
  cod: 125050,
  note: 'Call first',
}
const answer = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }))
const fake = (...replies: (() => Promise<Response>)[]) => {
  const f = vi.fn<typeof fetch>()
  for (const r of replies) f.mockImplementationOnce(r)
  return f
}
const sent = (f: ReturnType<typeof fake>, n: number) => {
  const [url, init] = f.mock.calls[n]!
  return {
    url: String(url),
    method: init!.method,
    headers: init!.headers as Record<string, string>,
    body: init!.body ? JSON.parse(String(init!.body)) : undefined,
  }
}

describe('courier merchant APIs (E1)', () => {
  it('Steadfast: create with the API and secret keys, then read the status', async () => {
    const f = fake(
      () => answer({ status: 200, consignment: { consignment_id: 77, tracking_code: 'SF77' } }),
      () => answer({ delivery_status: 'hold' }),
      () => answer({ message: 'Unauthorized' }, 401),
    )
    const api = createCourierApis({ mode: 'live', fetcher: f })('steadfast', {
      apiKey: 'k',
      secretKey: 's',
    })
    expect(await api.create(parcel)).toEqual({ ref: '77', tracking: 'SF77', charge: null })
    expect(sent(f, 0)).toMatchObject({
      url: 'https://portal.packzy.com/api/v1/create_order',
      method: 'POST',
      headers: { 'Api-Key': 'k', 'Secret-Key': 's' },
      body: {
        invoice: '1042',
        recipient_name: 'Rumana',
        recipient_phone: '01712345678',
        recipient_address: 'House 4, Mirpur, Dhaka',
        cod_amount: 1250.5,
        note: 'Call first',
      },
    })
    expect(await api.status('77')).toBe('hold')
    expect(sent(f, 1)).toMatchObject({
      url: 'https://portal.packzy.com/api/v1/status_by_cid/77',
      method: 'GET',
    })
    await expect(api.status('77')).rejects.toThrow('portal.packzy.com answered 401')
  })

  it('Pathao: a token first, then the order with the store id; the fee when given', async () => {
    const token = () => answer({ access_token: 'T' })
    const f = fake(
      token,
      () => answer({ data: { consignment_id: 'DL1', delivery_fee: 70 } }),
      token,
      () => answer({ data: { consignment_id: 'DL2' } }),
      token,
      () => answer({ data: { order_status: 'Delivered' } }),
    )
    const api = createCourierApis({ mode: 'live', fetcher: f })('pathao', {
      clientId: 'c',
      clientSecret: 'cs',
      username: 'u@shop.bd',
      password: 'p',
      storeId: '1234',
    })
    expect(await api.create(parcel)).toEqual({ ref: 'DL1', tracking: 'DL1', charge: 7000 })
    expect(sent(f, 0)).toMatchObject({
      url: 'https://api-hermes.pathao.com/aladdin/api/v1/issue-token',
      body: {
        client_id: 'c',
        client_secret: 'cs',
        username: 'u@shop.bd',
        password: 'p',
        grant_type: 'password',
      },
    })
    expect(sent(f, 1)).toMatchObject({
      url: 'https://api-hermes.pathao.com/aladdin/api/v1/orders',
      headers: { authorization: 'Bearer T' },
      body: {
        store_id: 1234,
        merchant_order_id: '1042',
        amount_to_collect: 1250.5,
        recipient_address: 'House 4, Mirpur, Dhaka',
      },
    })
    expect(await api.create(parcel)).toEqual({ ref: 'DL2', tracking: 'DL2', charge: null })
    expect(await api.status('DL1')).toBe('Delivered')
    expect(sent(f, 5).url).toBe('https://api-hermes.pathao.com/aladdin/api/v1/orders/DL1/info')
  })

  it('RedX: the district’s delivery area, then the parcel; no area means no parcel', async () => {
    const f = fake(
      () => answer({ areas: [{ id: 9, name: 'Mirpur' }] }),
      () => answer({ tracking_id: 'R9' }),
      () => answer({ parcel: { status: 'agent-hold' } }),
      () => answer({ areas: [] }),
    )
    const api = createCourierApis({ mode: 'live', fetcher: f })('redx', { token: 'tok' })
    expect(await api.create(parcel)).toEqual({ ref: 'R9', tracking: 'R9', charge: null })
    expect(sent(f, 0)).toMatchObject({
      url: 'https://openapi.redx.com.bd/v1.0.0-beta/areas?district_name=Dhaka',
      headers: { 'API-ACCESS-TOKEN': 'Bearer tok' },
    })
    expect(sent(f, 1).body).toMatchObject({
      delivery_area: 'Mirpur',
      delivery_area_id: 9,
      merchant_invoice_id: '1042',
      cash_collection_amount: '1250.5',
    })
    expect(await api.status('R9')).toBe('agent-hold')
    await expect(api.create(parcel)).rejects.toThrow('RedX has no delivery area for Dhaka')
  })

  it('log mode makes up references and calls nobody', async () => {
    const f = vi.fn<typeof fetch>()
    const api = createCourierApis({ mode: 'log', fetcher: f })('redx', { token: 'x' })
    expect(await api.create(parcel)).toEqual({
      ref: 'LOG-1042',
      tracking: 'LOG-1042',
      charge: null,
    })
    expect(await api.status('LOG-1042')).toBe('pending')
    expect(f).not.toHaveBeenCalled()
    expect(createCourierApis({ mode: 'log' })).toBeTypeOf('function')
  })
})
