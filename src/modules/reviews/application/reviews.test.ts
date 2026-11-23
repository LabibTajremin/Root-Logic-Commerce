import { describe, expect, it } from 'vitest'
import { summarize } from '../domain/reviews'
import { createReviews } from './reviews'
import type { OrderLookup, Review, ReviewsRepo } from './ports'

const setup = () => {
  const rows: (Review & { storeId: string })[] = []
  const repo: ReviewsRepo = {
    insert: async (storeId, r) => {
      if (rows.some((x) => x.orderId === r.orderId && x.productId === r.productId)) return null
      const row = {
        ...r,
        storeId,
        id: `r${rows.length}`,
        status: 'pending' as const,
        reply: null,
        createdAt: new Date(rows.length),
      }
      rows.push(row)
      return row
    },
    list: async (storeId, f) =>
      rows.filter(
        (r) =>
          r.storeId === storeId &&
          (!f.productId || r.productId === f.productId) &&
          (!f.status || r.status === f.status),
      ),
    update: async (storeId, id, patch) => {
      const r = rows.find((x) => x.storeId === storeId && x.id === id)
      return Boolean(r && Object.assign(r, patch))
    },
  }
  const lookup: OrderLookup = async (_s, orderNo, phone) =>
    phone !== '01712345678'
      ? null
      : orderNo === 1
        ? { id: 'o1', delivered: true, productIds: ['p1', 'p2'] }
        : { id: 'o2', delivered: false, productIds: ['p1'] }
  return createReviews({ repo, lookup })
}
const write = { rating: 5, body: ' Lovely ', name: 'Rahima' }

describe('reviews (A7)', () => {
  it('lets a shopper review what they received, once per order and product', async () => {
    const r = setup()
    expect(await r.reviewable('s', 1, '01712345678')).toEqual({
      orderId: 'o1',
      productIds: ['p1', 'p2'],
    })
    const made = await r.submit('s', {
      orderNo: 1,
      phone: '01712345678',
      productId: 'p1',
      ...write,
    })
    expect(made).toMatchObject({ body: 'Lovely', status: 'pending' })
    await expect(
      r.submit('s', { orderNo: 1, phone: '01712345678', productId: 'p1', ...write }),
    ).rejects.toThrow('review.duplicate')
    await expect(
      r.submit('s', { orderNo: 1, phone: '01712345678', productId: 'p9', ...write }),
    ).rejects.toThrow('review.not_in_order')
    await expect(
      r.submit('s', { orderNo: 2, phone: '01712345678', productId: 'p1', ...write }),
    ).rejects.toThrow('review.not_delivered')
    await expect(
      r.submit('s', { orderNo: 1, phone: '0000', productId: 'p1', ...write }),
    ).rejects.toThrow('review.order_not_found')
    await expect(
      r.submit('s', { orderNo: 1, phone: '01712345678', productId: 'p2', ...write, rating: 6 }),
    ).rejects.toThrow('validation')
    expect(await r.reviewable('s', 2, '01712345678')).toBeNull()
    expect(await r.reviewable('s', 1, '0000')).toBeNull()
  })

  it('shows only approved reviews, with replies, and moderates', async () => {
    const r = setup()
    const a = (await r.submit('s', {
      orderNo: 1,
      phone: '01712345678',
      productId: 'p1',
      ...write,
    }))!
    await r.submit('s', { orderNo: 1, phone: '01712345678', productId: 'p2', ...write, rating: 2 })
    expect(await r.forProduct('s', 'p1')).toEqual({ reviews: [], summary: null })
    await r.moderate('s', a.id, 'approved')
    await r.reply('s', a.id, ' Thank you! ')
    const shown = await r.forProduct('s', 'p1')
    expect([shown.reviews.map((x) => x.reply), shown.summary]).toEqual([
      ['Thank you!'],
      { count: 1, average: 5 },
    ])
    await r.reply('s', a.id, '  ')
    expect((await r.forProduct('s', 'p1')).reviews[0]!.reply).toBeNull()
    expect((await r.queue('s', 'pending')).length).toBe(1)
    await expect(r.moderate('s', 'nope', 'rejected')).rejects.toThrow('review.not_found')
    await expect(r.reply('s', 'nope', 'x')).rejects.toThrow('review.not_found')
  })

  it('averages to one decimal', () => {
    expect(summarize([5, 4, 4])).toEqual({ count: 3, average: 4.3 })
    expect(summarize([])).toBeNull()
  })
})
