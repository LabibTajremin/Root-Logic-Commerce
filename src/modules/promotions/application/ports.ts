import type { BannerData } from '../domain/promotions'

export type Banner = { id: string; data: BannerData; active: boolean; sortOrder: number }

export type BannersRepo = {
  list(storeId: string): Promise<Banner[]>
  insert(storeId: string, data: BannerData): Promise<Banner>
  setActive(storeId: string, id: string, active: boolean): Promise<boolean>
  remove(storeId: string, id: string): Promise<void>
  setOrder(storeId: string, ids: string[]): Promise<void>
}
