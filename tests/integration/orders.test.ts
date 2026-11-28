import { createCoupons, type Coupons } from '@/modules/coupons'
import { createCouponsRepo } from '@/infrastructure/db/repositories/coupons-repo'
import { createFraud, type Fraud } from '@/modules/fraud'
import { createFraudRepo } from '@/infrastructure/db/repositories/fraud-repo'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { createCatalog } from '@/modules/catalog'
import { createCatalogRepo } from '@/infrastructure/db/repositories/catalog-repo'
import { createOrders, shopRules, type OrderEvents, type Orders } from '@/modules/orders'
import { createStock, type Stock } from '@/modules/stock'
import { createEventBus } from '@/modules/shared'
import { createOrdersRepo } from '@/infrastructure/db/repositories/orders-repo'
import { createStockRepo } from '@/infrastructure/db/repositories/stock-repo'
import { orders as ordersTable, products, productVariants } from '@/infrastructure/db/schema'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

type TestDb = Awaited<ReturnType<typeof createTestDb>>
let fraud: Fraud
let db: TestDb, orders: Orders, coupons: Coupons, stock: Stock, store: string, other: string
let events: string[]
// The shop's checkout rules: two zones, no free-shipping rule, no order limits.
const zones = {
  ...shopRules,
  zones: [
    { id: 'dhaka', label: 'Inside Dhaka', charge: 6000 },
    { id: 'out', label: 'Outside Dhaka', charge: 13000 },
  ],
}

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
  for (const e of [
    'order.placed',
    'order.confirmed',
    'order.cancelled',
    'order.returned',
    'order.pending',
  ] as const)
    bus.on(e, (p) => void events.push(`${e}#${p.orderNo}`))
  coupons = createCoupons({ repo: createCouponsRepo(db) })
  fraud = createFraud({ repo: createFraudRepo(db) })
  orders = createOrders({ repo: createOrdersRepo(db), bus, coupons, fraud })
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
        id: expect.any(String),
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

  it('keeps the extra checkout fields: second phone, preferred time, gift wrap (C6), location (C5)', async () => {
    const p = await product(store)
    const { id } = await orders.placeOrder(
      store,
      {
        ...checkout(p.id),
        altPhone: '01812345678',
        preferredTime: 'evening',
        giftWrap: true,
        location: { lat: 23.81, lng: 90.41, accuracy: 25 },
      },
      zones,
    )
    expect(await orders.getOrder(store, id)).toMatchObject({
      shipAltPhone: '01812345678',
      preferredTime: 'evening',
      giftWrap: true,
      shipLocation: { lat: 23.81, lng: 90.41, accuracy: 25 },
    })
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
        scheduledFor: null,
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
    const catalog = createCatalog({
      repo: createCatalogRepo(db),
      shortId: () => 'x',
      audit: async () => {},
    })
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

describe('recommendations (A8)', () => {
  it('related falls back to the category; bought-together to what shared confirmed orders', async () => {
    const catalog = createCatalog({
      repo: createCatalogRepo(db),
      shortId: () => 'x',
      audit: async () => {},
    })
    const cat = await catalog.createCategory(store, { name: 'Tea' })
    const me = await catalog.createProduct(store, {
      name: 'Me',
      price: 100,
      stock: 5,
      status: 'active',
      categoryId: cat.id,
    })
    const sib = await catalog.createProduct(store, {
      name: 'Sib',
      price: 100,
      stock: 5,
      status: 'active',
      categoryId: cat.id,
    })
    const pal = await catalog.createProduct(store, {
      name: 'Pal',
      price: 100,
      stock: 5,
      status: 'active',
    })
    const both = await orders.placeOrder(
      store,
      {
        ...checkout(me.id),
        items: [
          { productId: me.id, variantId: null, quantity: 1 },
          { productId: pal.id, variantId: null, quantity: 1 },
        ],
      },
      zones,
    )
    await orders.changeStatus(store, both.id, 'CONFIRMED', 'u1')
    const r = await catalog.recommendationsFor(store, me)
    expect([r.related.map((x) => x.id), r.together.map((x) => x.id)]).toEqual([[sib.id], [pal.id]])
    const mine = await catalog.recommendationsFor(store, {
      ...me,
      relatedIds: [pal.id],
      fbtIds: [sib.id],
    })
    expect([mine.related.map((x) => x.id), mine.together.map((x) => x.id)]).toEqual([
      [pal.id, sib.id],
      [sib.id],
    ])
  })
})

describe('coupons at checkout (C2)', () => {
  it('takes the code off, stores it, counts uses per phone and in total', async () => {
    const p = await product(store, { price: 50000, stock: 20 })
    await coupons.create(store, {
      code: 'eid10',
      kind: 'percent',
      value: 10,
      perPhoneLimit: 1,
      totalLimit: 2,
    })
    const q = await orders.quote(store, { ...checkout(p.id), couponCode: ' Eid10 ' }, zones)
    expect(q).toMatchObject({ subtotal: 50000, discount: 5000, total: 51000, couponCode: 'EID10' })
    const { id } = await orders.placeOrder(store, { ...checkout(p.id), couponCode: 'EID10' }, zones)
    expect(await orders.getOrder(store, id)).toMatchObject({
      discount: 5000,
      couponCode: 'EID10',
      total: 51000,
    })
    await expect(
      orders.placeOrder(store, { ...checkout(p.id), couponCode: 'EID10' }, zones),
    ).rejects.toThrow('coupon.phone_limit')
    await orders.placeOrder(
      store,
      { ...checkout(p.id, 1, '01812345678'), couponCode: 'EID10' },
      zones,
    )
    await expect(
      orders.placeOrder(store, { ...checkout(p.id, 1, '01912345678'), couponCode: 'EID10' }, zones),
    ).rejects.toThrow('coupon.used_up')
    await expect(
      orders.placeOrder(store, { ...checkout(p.id), couponCode: 'NOPE' }, zones),
    ).rejects.toThrow('coupon.invalid')
  })

  it('the last use goes to one order only, even when two race', async () => {
    const p = await product(store, { price: 10000, stock: 20 })
    const c = await coupons.create(store, {
      code: 'LAST1',
      kind: 'fixed',
      value: 1000,
      totalLimit: 1,
    })
    // Both pass the early check (used 0 < 1); the transaction lets only one redeem.
    const results = await Promise.allSettled([
      orders.placeOrder(store, { ...checkout(p.id, 1, '01712345678'), couponCode: 'LAST1' }, zones),
      orders.placeOrder(store, { ...checkout(p.id, 1, '01812345678'), couponCode: 'LAST1' }, zones),
    ])
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected'])
    expect((await coupons.list(store)).find((x) => x.id === c.id)!.used).toBe(1)
  })

  it('applies the best automatic coupon when no code is typed; free shipping waives delivery', async () => {
    const p = await product(store, { price: 30000, stock: 20 })
    await coupons.create(store, {
      code: 'SHIPFREE',
      kind: 'free_shipping',
      value: 0,
      autoApply: true,
    })
    await coupons.create(store, { code: 'SMALL', kind: 'fixed', value: 100, autoApply: true })
    await coupons.create(store, {
      code: 'BIGOFF',
      kind: 'fixed',
      value: 99999,
      autoApply: true,
      minSubtotal: 999999,
    })
    await coupons.create(store, {
      code: 'OFFLINE',
      kind: 'fixed',
      value: 9999,
      autoApply: true,
      active: false,
    })
    const q = await orders.quote(store, checkout(p.id), zones)
    expect(q).toMatchObject({ discount: 6000, total: 30000, couponCode: 'SHIPFREE' })
    expect(
      await orders.quote(store, checkout(p.id), {
        ...shopRules,
        zones: [{ id: 'dhaka', label: 'Free', charge: 0 }],
      }),
    ).toMatchObject({
      discount: 100,
      couponCode: 'SMALL',
    })
    // A coupon with no total limit redeems without the limit check.
    const { id } = await orders.placeOrder(store, checkout(p.id), zones)
    expect(await orders.getOrder(store, id)).toMatchObject({
      couponCode: 'SHIPFREE',
      discount: 6000,
    })
    // Nothing fits: no coupon.
    expect(await orders.quote(other, checkout((await product(other)).id), zones)).toMatchObject({
      discount: 0,
      couponCode: null,
    })
  })

  it('owner coupons: unique codes per store, edits, unknown ids', async () => {
    const a = await coupons.create(store, { code: 'ONE', kind: 'fixed', value: 1 })
    await coupons.create(store, { code: 'TWO', kind: 'fixed', value: 1 })
    await coupons.create(other, { code: 'ONE', kind: 'fixed', value: 1 })
    await expect(coupons.create(store, { code: 'one', kind: 'fixed', value: 1 })).rejects.toThrow(
      'coupon.code_taken',
    )
    await coupons.update(store, a.id, { code: 'ONE', kind: 'percent', value: 5 })
    await expect(
      coupons.update(store, a.id, { code: 'TWO', kind: 'fixed', value: 1 }),
    ).rejects.toThrow('coupon.code_taken')
    await expect(
      coupons.update(store, '00000000-0000-0000-0000-000000000000', {
        code: 'NEW',
        kind: 'fixed',
        value: 1,
      }),
    ).rejects.toThrow('coupon.not_found')
    expect((await coupons.list(store)).map((c) => [c.code, c.kind])).toEqual([
      ['ONE', 'percent'],
      ['TWO', 'fixed'],
    ])
    expect(await coupons.find(store, ' two ')).toMatchObject({ code: 'TWO' })
  })
})

describe('free shipping and limits at checkout (C3, C7)', () => {
  it('waives delivery by the rule and refuses carts outside the limits', async () => {
    const p = await product(store, { price: 40000, stock: 20, minQty: 2, maxQty: 4 })
    const rules = (o: Partial<typeof zones>) => ({ ...zones, ...o })
    const free = rules({ freeShipping: { minSubtotal: 100000, zoneIds: [], productIds: [] } })
    expect(await orders.quote(store, checkout(p.id, 2), free)).toMatchObject({
      deliveryCharge: 6000,
    })
    expect(await orders.quote(store, checkout(p.id, 3), free)).toMatchObject({
      deliveryCharge: 0,
      total: 120000,
    })
    await expect(orders.placeOrder(store, checkout(p.id, 1), zones)).rejects.toThrow(
      'order.min_qty',
    )
    await expect(orders.placeOrder(store, checkout(p.id, 5), zones)).rejects.toThrow(
      'order.max_qty',
    )
    await expect(
      orders.placeOrder(
        store,
        checkout(p.id, 2),
        rules({ limits: { minOrder: 100000, maxOrder: null } }),
      ),
    ).rejects.toThrow('order.min_value')
  })
})

describe('manual orders and sources (C12, C15)', () => {
  it('places with a typed discount and a source; filters by source', async () => {
    const p = await product(store)
    const web = await orders.placeOrder(store, checkout(p.id), zones)
    const { id } = await orders.placeOrder(store, checkout(p.id, 2), zones, {
      source: 'chat',
      discount: 10000,
    })
    expect(await orders.getOrder(store, id)).toMatchObject({
      source: 'chat',
      subtotal: 69800,
      discount: 10000,
      total: 69800 + 6000 - 10000,
      couponCode: null,
    })
    expect((await orders.getOrder(store, web.id))!.source).toBe('web')
    const chat = await orders.listOrders(store, { source: 'chat' })
    expect(chat.rows.map((r) => [r.id, r.source])).toEqual([[id, 'chat']])
  })

  it('refuses a discount above the order or below zero', async () => {
    const p = await product(store)
    for (const discount of [-1, 34900 + 6000 + 1, 1.5])
      await expect(
        orders.placeOrder(store, checkout(p.id), zones, { source: 'manual', discount }),
      ).rejects.toThrow('order.discount_invalid')
  })

  it('finds the last order for a phone, in this store only', async () => {
    const p = await product(store)
    await orders.placeOrder(store, checkout(p.id), zones)
    await orders.placeOrder(store, { ...checkout(p.id), address: 'House 99, Road 1' }, zones)
    expect(await orders.lastForPhone(store, '+8801712345678')).toMatchObject({
      shipAddress: 'House 99, Road 1',
    })
    expect(await orders.lastForPhone(other, '01712345678')).toBeNull()
    expect(await orders.lastForPhone(store, '123')).toBeNull()
  })
})

describe('more statuses, partial delivery, courier returns, trash (C13, C21)', () => {
  const ship = async (id: string) => {
    for (const s of ['CONFIRMED', 'PROCESSING', 'SHIPPED'] as const)
      await orders.changeStatus(store, id, s, null)
  }

  it('holds and schedules; a due scheduled order goes back to pending', async () => {
    const p = await product(store)
    const { id } = await orders.placeOrder(store, checkout(p.id), zones)
    await orders.changeStatus(store, id, 'ON_HOLD', null)
    await orders.changeStatus(store, id, 'PENDING', null)
    for (const when of [undefined, new Date(Date.now() - 1000)])
      await expect(
        orders.changeStatus(store, id, 'SCHEDULED', null, null, { scheduledFor: when }),
      ).rejects.toThrow('order.schedule_invalid')
    const when = new Date(Date.now() + 86_400_000)
    await orders.changeStatus(store, id, 'SCHEDULED', null, null, { scheduledFor: when })
    expect(await orders.getOrder(store, id)).toMatchObject({
      status: 'SCHEDULED',
      scheduledFor: when,
    })
    expect(await orders.runStatusRules()).toEqual({ scheduled: 0, missing: 0 })
    expect(await orders.runStatusRules(new Date(Date.now() + 2 * 86_400_000))).toEqual({
      scheduled: 1,
      missing: 0,
    })
    const o = (await orders.getOrder(store, id))!
    expect(o).toMatchObject({ status: 'PENDING', scheduledFor: null })
    expect(o.events.at(-1)).toMatchObject({ actorId: null, note: 'system: scheduled date reached' })
    expect(events).toContain(`order.pending#${o.orderNo}`)
  })

  it('a partial delivery restocks only the undelivered lines', async () => {
    const a = await product(store, { stock: 5 })
    const b = await product(store, { stock: 5 })
    const { id } = await orders.placeOrder(
      store,
      {
        ...checkout(a.id, 2),
        items: [
          { productId: a.id, quantity: 2 },
          { productId: b.id, quantity: 1 },
        ],
      },
      zones,
    )
    await ship(id)
    const [la, lb] = (await orders.getOrder(store, id))!.items
    await expect(
      orders.changeStatus(store, id, 'PARTIAL_DELIVERED', null, null, { delivered: {} }),
    ).rejects.toThrow('order.partial_invalid')
    await expect(orders.changeStatus(store, id, 'PARTIAL_DELIVERED', null)).rejects.toThrow(
      'order.partial_invalid',
    )
    await orders.changeStatus(store, id, 'PARTIAL_DELIVERED', null, null, {
      delivered: { [la!.id]: 1, [lb!.id]: 1 },
    })
    expect([await stockOf(a.id), await stockOf(b.id)]).toEqual([4, 4])
  })

  it('a courier return restocks when received, not while returning; stale ones go missing', async () => {
    const p = await product(store, { stock: 5 })
    const { id } = await orders.placeOrder(store, checkout(p.id, 2), zones)
    await ship(id)
    await orders.changeStatus(store, id, 'RETURNING', null)
    expect(await stockOf(p.id)).toBe(3)
    expect(await orders.runStatusRules(new Date(Date.now() + 15 * 86_400_000))).toEqual({
      scheduled: 0,
      missing: 1,
    })
    expect((await orders.getOrder(store, id))!.status).toBe('RETURN_MISSING')
    expect(await stockOf(p.id)).toBe(3)
    await orders.changeStatus(store, id, 'RETURN_RECEIVED', null)
    expect(await stockOf(p.id)).toBe(5)
  })

  it('only cancelled orders go to the trash, and come back', async () => {
    const p = await product(store)
    const { id } = await orders.placeOrder(store, checkout(p.id), zones)
    await expect(orders.trash(store, id)).rejects.toThrow('order.trash_invalid')
    await orders.changeStatus(store, id, 'CANCELLED', null)
    await orders.trash(store, id)
    await expect(orders.trash(store, id)).rejects.toThrow('order.trash_invalid')
    expect((await orders.listOrders(store)).rows.map((r) => r.id)).not.toContain(id)
    expect((await orders.listOrders(store, { trash: true })).rows.map((r) => r.id)).toEqual([id])
    expect((await orders.getOrder(store, id))!.deletedAt).toBeInstanceOf(Date)
    await orders.restore(store, id)
    expect((await orders.listOrders(store)).rows.map((r) => r.id)).toContain(id)
  })
})

describe('returns and exchanges (C14)', () => {
  const deliver = async (id: string) => {
    for (const s of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const)
      await orders.changeStatus(store, id, s, null)
  }

  it('records returns with restock and refunds, and exchanges linked by number', async () => {
    const a = await product(store, { stock: 5 })
    const b = await product(store, { stock: 5 })
    const { id } = await orders.placeOrder(
      store,
      {
        ...checkout(a.id),
        items: [
          { productId: a.id, quantity: 2 },
          { productId: b.id, quantity: 1 },
        ],
      },
      zones,
    )
    const [la, lb] = (await orders.getOrder(store, id))!.items
    const r = {
      kind: 'return' as const,
      reason: 'size' as const,
      items: [{ itemId: la!.id, quantity: 1 }],
    }
    await expect(orders.recordReturn(store, id, r, null)).rejects.toThrow('return.not_delivered')
    await expect(orders.recordReturn(other, id, r, null)).rejects.toThrow('order.not_found')
    await deliver(id)
    await orders.recordReturn(
      store,
      id,
      { ...r, restock: true, refund: 34900, refundMethod: 'bKash' },
      null,
    )
    expect(await stockOf(a.id)).toBe(4)
    const swap = await orders.placeOrder(store, checkout(b.id), zones)
    const swapNo = (await orders.getOrder(store, swap.id))!.orderNo
    await expect(
      orders.recordReturn(store, id, { ...r, kind: 'exchange', exchangeOrderNo: 999999 }, null),
    ).rejects.toThrow('return.exchange_not_found')
    // The product of line b is gone: its return is recorded but nothing is restocked.
    await db.delete(products).where(eq(products.id, b.id))
    await orders.recordReturn(
      store,
      id,
      {
        kind: 'exchange',
        reason: 'damaged',
        note: 'Cracked lid',
        items: [{ itemId: lb!.id, quantity: 1 }],
        restock: true,
        exchangeOrderNo: swapNo,
      },
      null,
    )
    // Kept out of stock (e.g. damaged): the stock stays where it was.
    await orders.recordReturn(store, id, r, null)
    expect(await stockOf(a.id)).toBe(4)
    await expect(
      orders.recordReturn(store, id, { ...r, items: [{ itemId: la!.id, quantity: 2 }] }, null),
    ).rejects.toThrow('return.too_many')
    expect(await orders.listReturns(store, id)).toMatchObject([
      {
        kind: 'return',
        refund: 34900,
        refundMethod: 'bKash',
        restocked: true,
        exchangeOrderNo: null,
      },
      { kind: 'exchange', note: 'Cracked lid', exchangeOrderId: swap.id, exchangeOrderNo: swapNo },
      { kind: 'return', restocked: false, refund: 0 },
    ])
  })
})

describe('order guard: blocklist, limits, duplicates, report (D1, D3, D4, D5)', () => {
  const rules = { perWindow: 2, windowHours: 24, duplicateHours: 24, blockDuplicates: false }
  const web = (ip = '10.0.0.1', deviceId = 'dev-1') => ({
    guard: { client: { ip, deviceId }, rules },
  })

  it('records who ordered and refuses blocked phones, IPs and devices', async () => {
    const p = await product(store, { stock: 50 })
    const { id } = await orders.placeOrder(store, checkout(p.id), zones, web())
    expect(
      await db
        .select({ ip: ordersTable.clientIp, d: ordersTable.deviceId })
        .from(ordersTable)
        .where(eq(ordersTable.id, id)),
    ).toEqual([{ ip: '10.0.0.1', d: 'dev-1' }])
    await fraud.block(store, { kind: 'device', value: 'dev-9' })
    await fraud.block(store, { kind: 'ip', value: '10.0.0.9' })
    await fraud.block(store, { kind: 'phone', value: '01899999999' })
    await fraud.block(store, { kind: 'ip', value: '10.0.0.9' })
    await expect(
      orders.placeOrder(store, checkout(p.id), zones, web('10.0.0.2', 'dev-9')),
    ).rejects.toThrow('order.blocked')
    await expect(orders.placeOrder(store, checkout(p.id), zones, web('10.0.0.9'))).rejects.toThrow(
      'order.blocked',
    )
    await expect(
      orders.placeOrder(store, checkout(p.id, 1, '01899999999'), zones, web('10.0.0.3', 'dev-3')),
    ).rejects.toThrow('order.blocked')
    // Another store's blocklist doesn't apply; the shop's own manual orders are never guarded.
    await orders.placeOrder(other, checkout((await product(other)).id), zones, web('10.0.0.9'))
    await orders.placeOrder(store, checkout(p.id, 1, '01899999999'), zones)
    const blocks = await fraud.listBlocks(store)
    expect(blocks.map((b) => `${b.kind}:${b.value}`).sort()).toEqual([
      'device:dev-9',
      'ip:10.0.0.9',
      'phone:01899999999',
    ])
    await fraud.unblock(store, blocks.find((b) => b.kind === 'device')!.id)
    await orders.placeOrder(
      store,
      checkout(p.id, 1, '01822222222'),
      zones,
      web('10.0.0.4', 'dev-9'),
    )
    expect((await fraud.report(store)).attempts.map((a) => a.reason)).toEqual([
      'blocked',
      'blocked',
      'blocked',
    ])
  })

  it('limits orders per phone, IP or device in the window', async () => {
    const p = await product(store, { stock: 50 })
    await orders.placeOrder(store, checkout(p.id), zones, web('10.1.0.1', 'a'))
    await orders.placeOrder(store, checkout(p.id, 1, '01811111111'), zones, web('10.1.0.1', 'b'))
    // Same IP twice already.
    await expect(
      orders.placeOrder(store, checkout(p.id, 1, '01922222222'), zones, web('10.1.0.1', 'c')),
    ).rejects.toThrow('order.too_many')
    await orders.placeOrder(store, checkout(p.id, 1, '01922222222'), zones, web('10.1.0.2', 'c'))
  })

  it('blocks a same-phone, same-product repeat when the shop asks, and flags it otherwise', async () => {
    const p = await product(store, { stock: 50 })
    const q = await product(store, { stock: 50 })
    const first = await orders.placeOrder(store, checkout(p.id), zones, web('10.2.0.1', 'x'))
    const strict = {
      guard: {
        client: { ip: '10.2.0.2', deviceId: 'y' },
        rules: { ...rules, perWindow: 0, blockDuplicates: true },
      },
    }
    await expect(orders.placeOrder(store, checkout(p.id), zones, strict)).rejects.toThrow(
      'order.duplicate',
    )
    await orders.placeOrder(store, checkout(q.id), zones, strict)
    const repeat = await orders.placeOrder(store, checkout(p.id), zones)
    const third = await orders.placeOrder(store, checkout(p.id), zones)
    const { rows } = await orders.listOrders(store, { duplicateHours: 24 })
    const firstNo = (await orders.getOrder(store, first.id))!.orderNo
    expect(rows.find((r) => r.id === repeat.id)!.duplicateOf).toMatchObject({
      orderNo: firstNo,
      status: 'PENDING',
    })
    expect(rows.find((r) => r.id === first.id)!.duplicateOf).toBeNull()
    // Several earlier matches: the nearest one is named.
    const repeatNo = (await orders.getOrder(store, repeat.id))!.orderNo
    expect(rows.find((r) => r.id === third.id)!.duplicateOf).toMatchObject({ orderNo: repeatNo })
  })

  it('reports the phones with the most lost orders', async () => {
    const p = await product(store, { stock: 50 })
    for (let i = 0; i < 2; i++) {
      const { id } = await orders.placeOrder(store, checkout(p.id, 1, '01733333333'), zones)
      await orders.changeStatus(store, id, 'CANCELLED', null)
    }
    await orders.placeOrder(store, checkout(p.id, 1, '01733333333'), zones)
    await orders.placeOrder(store, checkout(p.id, 1, '01744444444'), zones)
    expect((await fraud.report(store)).risky).toEqual([{ phone: '01733333333', lost: 2, total: 3 }])
  })
})

describe('order rows and the order page (F12)', () => {
  it('rows carry the address, lines with SKU, delivery and payment', async () => {
    const p = await product(store, { sku: 'DB-1' })
    const { id } = await orders.placeOrder(store, checkout(p.id, 2), zones)
    const row = (await orders.listOrders(store)).rows.find((r) => r.id === id)!
    expect(row).toMatchObject({
      shipAddress: 'House 12, Road 4, Mirpur',
      deliveryCharge: 6000,
      paymentStatus: 'unpaid',
      lines: [{ name: 'Door Bell', variantLabel: null, quantity: 2, sku: 'DB-1' }],
    })
  })

  it('shows earlier orders from the phone and the device count', async () => {
    const p = await product(store, { stock: 20 })
    const web = {
      guard: {
        client: { ip: '10.9.0.1', deviceId: 'dev-h' },
        rules: { perWindow: 0, windowHours: 24, duplicateHours: 24, blockDuplicates: false },
      },
    }
    const a = await orders.placeOrder(store, checkout(p.id), zones, web)
    const b = await orders.placeOrder(store, checkout(p.id), zones, web)
    const ob = (await orders.getOrder(store, b.id))!
    const h = await orders.history(store, ob)
    expect(h.previous.map((o) => o.id)).toContain(a.id)
    expect(h.previous.map((o) => o.id)).not.toContain(b.id)
    expect(h.deviceOrders).toBe(2)
    const manual = (await orders.getOrder(
      store,
      (await orders.placeOrder(store, checkout(p.id), zones)).id,
    ))!
    expect((await orders.history(store, manual)).deviceOrders).toBe(0)
  })

  it('edits the name and address until the parcel ships', async () => {
    const p = await product(store)
    const { id } = await orders.placeOrder(store, checkout(p.id), zones)
    const ship = {
      name: 'Rahima K.',
      altPhone: '01812345678',
      address: 'Flat 3B, Road 9',
      area: 'Uttara',
      district: 'Dhaka',
    }
    await orders.editShipping(store, id, ship)
    expect(await orders.getOrder(store, id)).toMatchObject({
      shipName: 'Rahima K.',
      shipAltPhone: '01812345678',
      shipArea: 'Uttara',
    })
    await expect(orders.editShipping(store, id, { ...ship, address: 'x' })).rejects.toThrow(
      'validation',
    )
    await expect(orders.editShipping(other, id, ship)).rejects.toThrow('order.not_found')
    for (const s of ['CONFIRMED', 'PROCESSING', 'SHIPPED'] as const)
      await orders.changeStatus(store, id, s, null)
    await expect(orders.editShipping(store, id, ship)).rejects.toThrow('order.locked')
  })

  it('prices flash-sale units until the cap, and takes combo savings (A9, B11)', async () => {
    const [a, b] = [
      await product(store, { stock: 20 }),
      await product(store, { price: 10000, stock: 20 }),
    ]
    const now = Date.now()
    const flash = {
      on: true,
      name: 'Friday',
      startsAt: new Date(now - 60_000),
      endsAt: new Date(now + 3_600_000),
      cap: 3,
      items: [{ productId: a.id, price: 30000, percent: null }],
    }
    const rules = { ...zones, flash }
    const total = async (o: { id: string }) => (await orders.getOrder(store, o.id))!
    const first = await orders.placeOrder(store, checkout(a.id, 2), rules)
    expect((await total(first)).subtotal).toBe(60000)
    expect(await orders.flashSold(store, flash)).toEqual(new Map([[a.id, 2]]))
    // A cancelled order gives its units back to the sale.
    await orders.changeStatus(store, first.id, 'CANCELLED', null)
    await orders.placeOrder(store, checkout(a.id, 3), rules)
    expect((await total(await orders.placeOrder(store, checkout(a.id, 1), rules))).subtotal).toBe(
      34900,
    )
    // After the window the normal price is back.
    const over = { ...rules, flash: { ...flash, endsAt: new Date(now - 1) } }
    expect((await total(await orders.placeOrder(store, checkout(a.id, 1), over))).subtotal).toBe(
      34900,
    )

    const combo = {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Set',
      slug: 'set',
      on: true,
      items: [
        { productId: a.id, qty: 1 },
        { productId: b.id, qty: 1 },
      ],
      price: 40000,
    }
    const both = {
      ...checkout(a.id),
      items: [
        { productId: a.id, quantity: 1 },
        { productId: b.id, quantity: 1 },
      ],
    }
    expect(await orders.quote(store, both, { ...zones, combos: [combo] })).toMatchObject({
      discount: 4900,
    })
    // A hand-typed discount (manual orders) replaces every other saving.
    const manual = await orders.placeOrder(
      store,
      both,
      { ...zones, combos: [combo] },
      { discount: 100 },
    )
    expect((await total(manual)).discount).toBe(100)
    expect(await createOrdersRepo(db).soldSince(store, [], new Date(0))).toEqual(new Map())
  })
})
