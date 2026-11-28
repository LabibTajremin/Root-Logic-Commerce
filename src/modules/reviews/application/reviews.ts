import { DomainError, validate } from '@/modules/shared'
import {
  reviewInput,
  reviewStatuses,
  summarize,
  type ReviewInput,
  type ReviewStatus,
} from '../domain/reviews'
import type { OrderLookup, ReviewsRepo, TrackedOrder } from './ports'

/** Order tracking (number + phone) as the reviews' order lookup. */
export const lookupFromTracking =
  (
    track: (storeId: string, orderNo: number, phone: string) => Promise<TrackedOrder | null>,
  ): OrderLookup =>
  async (storeId, orderNo, phone) => {
    const o = await track(storeId, orderNo, phone)
    return (
      o && {
        id: o.id,
        delivered: o.status === 'DELIVERED',
        productIds: o.items.map((i) => i.productId),
      }
    )
  }

type Submit = ReviewInput & { orderNo: number; phone: string; productId: string }

export const createReviews = ({ repo, lookup }: { repo: ReviewsRepo; lookup: OrderLookup }) => {
  const mustUpdate = async (
    storeId: string,
    id: string,
    patch: Parameters<ReviewsRepo['update']>[2],
  ) => {
    if (!(await repo.update(storeId, id, patch))) throw new DomainError('review.not_found')
  }
  return {
    /** What a delivered order can review; null if it is not found or not delivered yet. */
    async reviewable(storeId: string, orderNo: number, phone: string) {
      const o = await lookup(storeId, orderNo, phone)
      return o?.delivered ? { orderId: o.id, productIds: o.productIds } : null
    },
    async submit(storeId: string, input: Submit) {
      const d = validate(reviewInput, input)
      const o = await lookup(storeId, input.orderNo, input.phone)
      if (!o) throw new DomainError('review.order_not_found')
      if (!o.delivered) throw new DomainError('review.not_delivered')
      if (!o.productIds.includes(input.productId)) throw new DomainError('review.not_in_order')
      return (
        (await repo.insert(storeId, { ...d, orderId: o.id, productId: input.productId })) ??
        Promise.reject(new DomainError('review.duplicate'))
      )
    },
    /** The product page: approved reviews and their summary (none → no rating shown). */
    async forProduct(storeId: string, productId: string) {
      const reviews = await repo.list(storeId, { productId, status: 'approved' })
      return { reviews, summary: summarize(reviews.map((r) => r.rating)) }
    },
    queue: (storeId: string, status?: ReviewStatus) => repo.list(storeId, { status }),
    /** A7 screenshot reviews: owner-uploaded chat screenshots, newest first. */
    screenshots: (storeId: string) => repo.listShots(storeId),
    addScreenshot: (storeId: string, mediaId: string, caption: string) =>
      repo.addShot(storeId, { mediaId, caption: caption.trim().slice(0, 120) }),
    removeScreenshot: (storeId: string, id: string) => repo.removeShot(storeId, id),
    async moderate(storeId: string, id: string, status: ReviewStatus) {
      // The status arrives from a form: anything unknown is refused.
      if (!reviewStatuses.includes(status)) throw new DomainError('validation')
      await mustUpdate(storeId, id, { status })
    },
    reply: (storeId: string, id: string, text: string) =>
      mustUpdate(storeId, id, { reply: text.trim() || null }),
  }
}

export type Reviews = ReturnType<typeof createReviews>
