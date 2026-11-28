import type { ReviewStatus } from '../domain/reviews'

export type Review = {
  id: string
  productId: string
  orderId: string
  name: string
  rating: number
  body: string
  status: ReviewStatus
  reply: string | null
  createdAt: Date
}
export type ReviewFilter = { productId?: string; status?: ReviewStatus }

export type Screenshot = { id: string; mediaId: string; caption: string }

export type ReviewsRepo = {
  listShots(storeId: string): Promise<Screenshot[]>
  addShot(storeId: string, shot: Omit<Screenshot, 'id'>): Promise<Screenshot>
  removeShot(storeId: string, id: string): Promise<void>
  /** Null when this order already reviewed this product. */
  insert(
    storeId: string,
    r: Omit<Review, 'id' | 'status' | 'reply' | 'createdAt'>,
  ): Promise<Review | null>
  list(storeId: string, filter: ReviewFilter): Promise<Review[]>
  /** False when the review is not in this store. */
  update(
    storeId: string,
    id: string,
    patch: Partial<Pick<Review, 'status' | 'reply'>>,
  ): Promise<boolean>
}

/** The order a shopper names by number + phone, as reviews need it. */
export type OrderLookup = (
  storeId: string,
  orderNo: number,
  phone: string,
) => Promise<{ id: string; delivered: boolean; productIds: (string | null)[] } | null>

/** What order tracking returns, as far as reviews care. */
export type TrackedOrder = {
  id: string
  status: string
  items: { productId: string | null }[]
}
