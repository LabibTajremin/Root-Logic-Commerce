import { createCoupons } from '@/modules/coupons'
import { createCouponsRepo } from '@/infrastructure/db/repositories/coupons-repo'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOrders, type OrderEvents, type Orders } from '@/modules/orders'
import { createReviews, type Reviews } from '@/modules/reviews'
import { createEventBus } from '@/modules/shared'
import { createOrdersRepo } from '@/infrastructure/db/repositories/orders-repo'
import { createReviewsRepo } from '@/infrastructure/db/repositories/reviews-repo'
import { media, products } from '@/infrastructure/db/schema'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

let db: Awaited<ReturnType<typeof createTestDb>>,
  orders: Orders,
  reviews: Reviews,
  store: string,
  other: string,
  productId: string,
  orderNo: number

beforeEach(async () => {
  db = await createTestDb()
  orders = createOrders({
    repo: createOrdersRepo(db),
    bus: createEventBus<OrderEvents>(vi.fn()),
    coupons: createCoupons({ repo: createCouponsRepo(db) }),
  })
  reviews = createReviews({
    repo: createReviewsRepo(db),
    lookup: async (s, no, phone) => {
      const o = await orders.trackOrder(s, no, phone)
      return (
        o && {
          id: o.id,
          delivered: o.status === 'DELIVERED',
          productIds: o.items.map((i) => i.productId),
        }
      )
    },
  })
  store = await seedStore(db)
  other = await seedStore(db, 'other')
  const [p] = await db
    .insert(products)
    .values({ storeId: store, name: 'Tea', slug: 'tea', price: 100, stock: 5, status: 'active' })
    .returning()
  productId = p!.id
  const o = await orders.placeOrder(
    store,
    {
      name: 'Rahima',
      phone: '01712345678',
      address: 'House 1',
      area: 'Mirpur',
      district: 'Dhaka',
      zoneId: 'd',
      items: [{ productId, quantity: 1 }],
    },
    [{ id: 'd', label: 'Dhaka', charge: 0 }],
  )
  orderNo = o.orderNo
  for (const s of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const)
    await orders.changeStatus(store, o.id, s, null)
})

describe('reviews repo (A7)', () => {
  it('stores one review per order and product, moderates and replies, per store', async () => {
    const r = await reviews.submit(store, {
      orderNo,
      phone: '01712345678',
      productId,
      rating: 4,
      body: 'Good',
      name: 'Rahima',
    })
    await expect(
      reviews.submit(store, {
        orderNo,
        phone: '01712345678',
        productId,
        rating: 5,
        body: '',
        name: 'R',
      }),
    ).rejects.toThrow('review.duplicate')
    expect(await reviews.queue(store)).toHaveLength(1)
    expect(await reviews.queue(other)).toEqual([])
    await reviews.moderate(store, r.id, 'approved')
    await reviews.reply(store, r.id, 'Thanks')
    await expect(reviews.moderate(other, r.id, 'rejected')).rejects.toThrow('review.not_found')
    expect(await reviews.forProduct(store, productId)).toMatchObject({
      reviews: [{ rating: 4, reply: 'Thanks', status: 'approved' }],
      summary: { count: 1, average: 4 },
    })
  })

  it('keeps screenshot reviews per store, newest first', async () => {
    const [m] = await db
      .insert(media)
      .values({ storeId: store, kind: 'local', ref: 'x' })
      .returning()
    const a = await reviews.addScreenshot(store, m!.id, 'From WhatsApp')
    expect(await reviews.screenshots(store)).toEqual([
      { id: a.id, mediaId: m!.id, caption: 'From WhatsApp' },
    ])
    expect(await reviews.screenshots(other)).toEqual([])
    await reviews.removeScreenshot(other, a.id)
    expect(await reviews.screenshots(store)).toHaveLength(1)
    await reviews.removeScreenshot(store, a.id)
    expect(await reviews.screenshots(store)).toEqual([])
  })
})
