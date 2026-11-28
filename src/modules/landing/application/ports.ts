import type { LandingData } from '../domain/landing'

export type Landing = LandingData & {
  id: string
  visits: number
  /** Orders placed on this page. */
  orders: number
  createdAt: Date
}

export type LandingRepo = {
  list(storeId: string): Promise<Landing[]>
  bySlug(storeId: string, slug: string): Promise<Landing | null>
  byId(storeId: string, id: string): Promise<Landing | null>
  /** null when the slug is taken. */
  insert(storeId: string, page: LandingData): Promise<string | null>
  /** null when the slug is taken, false when the page is gone. */
  update(storeId: string, id: string, page: LandingData): Promise<boolean | null>
  remove(storeId: string, id: string): Promise<void>
  addVisit(storeId: string, id: string): Promise<void>
}

export type ProductFacts = {
  name: string
  description: string
  price: number
  compareAtPrice: number | null
}
