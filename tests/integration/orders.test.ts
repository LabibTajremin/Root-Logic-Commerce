import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { createCatalog } from '@/modules/catalog'
import { createCatalogRepo } from '@/infrastructure/db/repositories/catalog-repo'
import { createOrders, type OrderEvents, type Orders } from '@/modules/orders'
import { createStock, type Stock } from '@/modules/stock'
import { createEventBus } from '@/modules/shared'
import { createOrdersRepo } from '@/infrastructure/db/repositories/orders-repo'
import { createStockRepo } from '@/infrastructure/db/repositories/stock-repo'
import { products, productVariants } from '@/infrastructure/db/schema'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

type TestDb = Awaited<ReturnType<typeof createTestDb>>
let db: TestDb, orders: Orders, stock: Stock, store: string, other: string
let events: string[]
const zones = [
  { id: 'dhaka', label: 'Inside Dhaka', charge: 6000 },
  { id: 'out', label: 'Outside Dhaka', charge: 13000 },
]

const product = async (s: string, o: Partial<typeof products.$inferInsert> = {}) =>
  (
    await db
      .insert(products)
      .values({
        storeId: s,
        name: 'Door Bell',
        slug: 'p-' + Math.random(),
        price: 34900,
        costPrice: 19000,
        stock: 5,
        status: 'active',
        ...o,
      })
      .returning()
  )[0]!
const stockOf = async (id: string) =>
  (await db.select({ s: products.stock }).from(products).where(eq(products.id, id)))[0]!.s
const variantProduct = async () => {
  const p = await product(store, {
    stock: 5,
    options: [{ name: 'Size', values: ['M', 'L'] }],
  })
  const [m, l] = await db
    .insert(productVariants)
    .values([
      {
        storeId: store,
        productId: p.id,
        options: { Size: 'M' },
        price: 40000,
        costPrice: 20000,
        stock: 1,
        sortOrder: 0,
      },
      {
        storeId: store,
        productId: p.id,
        options: { Size: 'L' },
        price: 45000,
        stock: 4,
        sortOrder: 1,
      },
    ])
    .returning()
  return { p, m: m!, l: l! }
}
const variantStock = async (id: string) =>
  (
    await db
      .select({ s: productVariants.stock })
      .from(productVariants)
      .where(eq(productVariants.id, id))
  )[0]!.s
const checkout = (productId: string, quantity = 1, phone = '01712345678') => ({
  name: 'Rahima Khatun',
  phone,
  address: 'House 12, Road 4, Mirpur',
  area: 'Mirpur',
  district: 'Dhaka',
  zoneId: 'dhaka',
  items: [{ productId, quantity }],
})

beforeEach(async () => {
  db = await createTestDb()
  events = []
  const bus = createEventBus<OrderEvents>(vi.fn())
  for (const e of ['order.placed', 'order.confirmed', 'order.cancelled', 'order.returned'] as const)
    bus.on(e, (p) => void events.push(`${e}#${p.orderNo}`))
  orders = createOrders({ repo: createOrdersRepo(db), bus })
  stock = createStock({ repo: createStockRepo(db) })
  store = await seedStore(db)
  other = await seedStore(db, 'other')
})

describe('placing orders', () => {
  it('snapshots items, prices the delivery zone, numbers orders per store and emits order.placed', async () => {
    const p = await product(store)
    const a = await orders.placeOrder(
      store,
      {
        ...checkout(p.id, 1),
        items: [
          { productId: p.id, quantity: 1 },
          { productId: p.id, quantity: 1 },
        ],
      },
      zones,
    )
    const b = await orders.placeOrder(store, checkout(p.id, 1, '01812345678'), zones)
    const c = await orders.placeOrder(other, checkout((await product(other)).id), zones)
    expect([a.orderNo, b.orderNo, c.orderNo]).toEqual([1001, 1002, 1001])
    const o = (await orders.getOrder(store, a.id))!
    expect(o).toMatchObject({
      status: 'PENDING',
      subtotal: 69800,
      deliveryCharge: 6000,
      total: 75800,
      deliveryZone: 'Inside Dhaka',
      stockDeducted: false,
    })
    expect(o.items).toEqual([
      {
        productId: p.id,
        variantId: null,
        variantLabel: null,
        name: 'Door Bell',
        unitPrice: 34900,
        unitCost: 19000,
        quantity: 2,
      },
    ])
    expect(o.events.map((e) => e.toStatus)).toEqual(['PENDING'])
    expect(await stockOf(p.id)).toBe(5) // not deducted on placement
    expect(events).toEqual(['order.placed#1001', 'order.placed#1002', 'order.placed#1001'])
  })

  it('rejects bad zones, unavailable products, short stock and invalid input', async () => {
    const p = await product(store, { stock: 1 })
    const draft = await product(store, { status: 'draft' })
    await expect(
      orders.placeOrder(store, { ...checkout(p.id), zoneId: 'mars' }, zones),
    ).rejects.toThrow('checkout.zone_invalid')
    await expect(orders.placeOrder(store, checkout(draft.id), zones)).rejects.toThrow(
      'product.unavailable',
    )
    await expect(
      orders.placeOrder(store, checkout((await product(other)).id), zones),
    ).rejects.toThrow('product.unavailable')
    await expect(orders.placeOrder(store, checkout(p.id, 2), zones)).rejects.toMatchObject({
      code: 'stock.insufficient',
      params: { available: 1 },
    })
    await expect(orders.placeOrder(store, checkout(p.id, 1, '123'), zones)).rejects.toMatchObject({
      code: 'validation',
    })
  })
})

describe('status flow with stock', () => {
  it('confirm deducts, cancel restocks, every step is logged', async () => {
    const p = await product(store, { stock: 3 })
    const { id } = await orders.placeOrder(store, checkout(p.id, 2), zones)
    await orders.changeStatus(store, id, 'CONFIRMED', 'u1', 'called customer')
    expect(await stockOf(p.id)).toBe(1)
    await orders.changeStatus(store, id, 'CANCELLED', 'u1')
    expect(await stockOf(p.id)).toBe(3)
    const o = (await orders.getOrder(store, id))!
    expect(o.events.map((e) => [e.fromStatus, e.toStatus, e.actorId])).toEqual([
      [null, 'PENDING', null],
      ['PENDING', 'CONFIRMED', 'u1'],
      ['CONFIRMED', 'CANCELLED', 'u1'],
    ])
    expect((await stock.history(store, p.id)).map((m) => [m.delta, m.reason]).sort()).toEqual([
      [-2, 'order_confirmed'],
      [2, 'order_restocked'],
    ])
    expect(events).toContain('order.confirmed#1001')
    expect(events).toContain('order.cancelled#1001')
  })

  it('variants: price and label from the variant, stock moves on the variant (A1)', async () => {
    const { p, m, l } = await variantProduct()
    const items = [
      { productId: p.id, variantId: l.id, quantity: 2 },
      { productId: p.id, variantId: m.id, quantity: 1 },
    ]
    const { id } = await orders.placeOrder(store, { ...checkout(p.id), items }, zones)
    const o = (await orders.getOrder(store, id))!
    expect(o.items.map((i) => [i.variantLabel, i.unitPrice, i.quantity])).toEqual([
      ['L', 45000, 2],
      ['M', 40000, 1],
    ])
    expect(o.subtotal).toBe(130000)
    await orders.changeStatus(store, id, 'CONFIRMED', 'u1')
    expect([await variantStock(m.id), await variantStock(l.id), await stockOf(p.id)]).toEqual([
      0, 2, 2,
    ])
    expect((await stock.history(store, p.id)).map((m) => m.delta).sort((a, b) => a - b)).toEqual([
      -2, -1,
    ])
    await orders.changeStatus(store, id, 'CANCELLED', 'u1')
    expect([await variantStock(m.id), await variantStock(l.id), await stockOf(p.id)]).toEqual([
      1, 4, 5,
    ])
    // The last M is gone once another order takes it: confirming a second one fails.
    const a = await orders.placeOrder(store, { ...checkout(p.id), items: [items[1]!] }, zones)
    const b = await orders.placeOrder(store, { ...checkout(p.id), items: [items[1]!] }, zones)
    await orders.changeStatus(store, a.id, 'CONFIRMED', 'u1')
    await expect(orders.changeStatus(store, b.id, 'CONFIRMED', 'u1')).rejects.toThrow(
      'stock.insufficient',
    )
    await expect(
      stock.adjustStock(store, p.id, { delta: 1, note: 'found one' }, 'u1'),
    ).rejects.toThrow('stock.has_variants')
  })

  it('variants: a product with options needs one of its own variants, in stock', async () => {
    const { p, m, l } = await variantProduct()
    const plain = await product(store)
    const order = (productId: string, variantId: string | null, quantity = 1) =>
      orders.placeOrder(
        store,
        { ...checkout(p.id), items: [{ productId, variantId, quantity }] },
        zones,
      )
    await expect(order(p.id, null)).rejects.toThrow('product.unavailable')
    await expect(order(plain.id, m.id)).rejects.toThrow('product.unavailable')
    await expect(order(p.id, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      'product.unavailable',
    )
    await expect(order(p.id, m.id, 2)).rejects.toThrow('stock.insufficient')
    expect(await order(p.id, l.id, 4)).toMatchObject({ orderNo: expect.any(Number) })
  })

  it('returns after delivery restock; cancelling an unconfirmed order does not', async () => {
    const p = await product(store, { stock: 2 })
    const a = await orders.placeOrder(store, checkout(p.id), zones)
    for (const s of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED'] as const)
      await orders.changeStatus(store, a.id, s, 'u1')
    expect(await stockOf(p.id)).toBe(2)
    const b = await orders.placeOrder(store, checkout(p.id), zones)
    await orders.changeStatus(store, b.id, 'CANCELLED', null)
    expect(await stockOf(p.id)).toBe(2)
  })

  it('never oversells: the second confirm for the last unit fails and leaves the order pending', async () => {
    const p = await product(store, { stock: 1 })
    const a = await orders.placeOrder(store, checkout(p.id), zones)
    const b = await orders.placeOrder(store, checkout(p.id, 1, '01912345678'), zones)
    const results = await Promise.allSettled([
      orders.changeStatus(store, a.id, 'CONFIRMED', 'u1'),
      orders.changeStatus(store, b.id, 'CONFIRMED', 'u2'),
    ])
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected'])
    expect(
      (results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason.code,
    ).toBe('stock.insufficient')
    expect(await stockOf(p.id)).toBe(0)
    const statuses = [
      (await orders.getOrder(store, a.id))!.status,
      (await orders.getOrder(store, b.id))!.status,
    ].sort()
    expect(statuses).toEqual(['CONFIRMED', 'PENDING'])
  })

  it('rejects invalid transitions, unknown orders and stale updates', async () => {
    const p = await product(store)
    const { id } = await orders.placeOrder(store, checkout(p.id), zones)
    await expect(orders.changeStatus(store, id, 'DELIVERED', 'u1')).rejects.toThrow(
      'order.invalid_transition',
    )
    await expect(orders.changeStatus(other, id, 'CONFIRMED', 'u1')).rejects.toThrow(
      'order.not_found',
    )
    await expect(
      createOrdersRepo(db).transition(store, id, {
        from: 'SHIPPED',
        to: 'DELIVERED',
        actorId: null,
        note: null,
        stock: null,
      }),
    ).rejects.toThrow('order.conflict')
  })
})

describe('listing and tracking', () => {
  it('filters by status, date, phone or order number, with paging', async () => {
    const p = await product(store, { stock: 10 })
    const a = await orders.placeOrder(store, checkout(p.id), zones)
    await orders.placeOrder(store, checkout(p.id, 1, '01812345678'), zones)
    await orders.changeStatus(store, a.id, 'CONFIRMED', 'u1')
    expect((await orders.listOrders(store)).total).toBe(2)
    expect(
      (await orders.listOrders(store, { status: 'CONFIRMED' })).rows.map((r) => r.orderNo),
    ).toEqual([1001])
    expect(
      (await orders.listOrders(store, { search: '01812' })).rows.map((r) => r.orderNo),
    ).toEqual([1002])
    expect(
      (await orders.listOrders(store, { search: '#1001' })).rows.map((r) => r.orderNo),
    ).toEqual([1001])
    expect(
      (
        await orders.listOrders(store, {
          from: new Date(Date.now() - 60_000),
          to: new Date(Date.now() + 60_000),
          limit: 1,
          offset: 1,
        })
      ).rows,
    ).toHaveLength(1)
    expect((await orders.listOrders(store, { from: new Date(Date.now() + 60_000) })).total).toBe(0)
  })

  it('tracks an order only with the matching phone', async () => {
    const p = await product(store)
    const { orderNo } = await orders.placeOrder(store, checkout(p.id), zones)
    expect(await orders.trackOrder(store, orderNo, '+880 1712-345678')).toMatchObject({
      orderNo,
      status: 'PENDING',
    })
    expect(await orders.trackOrder(store, orderNo, '01812345678')).toBeNull()
    expect(await orders.trackOrder(store, orderNo, 'nope')).toBeNull()
    expect(await orders.trackOrder(store, Number.NaN, '+8801712345678')).toBeNull()
  })
})

describe('manual stock', () => {
  it('adjusts with a reason, never below zero, and reports low stock', async () => {
    const p = await product(store, { stock: 6, lowStockThreshold: 5 })
    await product(store, { stock: 1, status: 'draft' })
    expect(await stock.adjustStock(store, p.id, { delta: -2, note: 'damaged' }, 'u1')).toBe(4)
    expect(await stock.adjustStock(store, p.id, { delta: 10, note: 'restock' }, 'u1')).toBe(14)
    await expect(
      stock.adjustStock(store, p.id, { delta: -99, note: 'oops' }, 'u1'),
    ).rejects.toThrow('stock.insufficient')
    await expect(
      stock.adjustStock(store, p.id, { delta: 0, note: 'noop' }, 'u1'),
    ).rejects.toMatchObject({ code: 'validation' })
    await expect(stock.adjustStock(other, p.id, { delta: 1, note: 'cross' }, 'u1')).rejects.toThrow(
      'product.not_found',
    )
    await stock.adjustStock(store, p.id, { delta: -10, note: 'sold offline' }, 'u1')
    expect((await stock.lowStock(store)).map((x) => x.stock)).toEqual([4])
    expect((await stock.history(store)).map((m) => m.note)).toEqual([
      'sold offline',
      'restock',
      'damaged',
    ])
  })
})

describe('listing data (A11)', () => {
  it('counts units sold on confirmed orders only and lists the cheapest variant price', async () => {
    const catalog = createCatalog({ repo: createCatalogRepo(db), shortId: () => 'x' })
    const { p, m } = await variantProduct()
    const plain = await product(store, { price: 30000 })
    const sold = await orders.placeOrder(
      store,
      { ...checkout(p.id), items: [{ productId: p.id, variantId: m.id, quantity: 1 }] },
      zones,
    )
    await orders.changeStatus(store, sold.id, 'CONFIRMED', 'u1')
    const cancelled = await orders.placeOrder(store, checkout(plain.id, 2), zones)
    await orders.changeStatus(store, cancelled.id, 'CONFIRMED', 'u1')
    await orders.changeStatus(store, cancelled.id, 'CANCELLED', 'u1')
    await orders.placeOrder(store, checkout(plain.id), zones) // pending: not sold yet
    const items = await catalog.listingItems(store, [
      (await catalog.getProduct(store, p.id))!,
      (await catalog.getProduct(store, plain.id))!,
    ])
    expect(items.map((i) => [i.price, i.sold, i.inStock, i.options])).toEqual([
      [40000, 1, true, { Size: ['M', 'L'] }],
      [30000, 0, true, {}],
    ])
  })
})
