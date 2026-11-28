import type { PageInput } from '../domain/pages'

export type Page = PageInput & { id: string; sortOrder: number }

export type PagesRepo = {
  list(storeId: string): Promise<Page[]>
  /** Null when the slug is already taken in this store. */
  insert(storeId: string, input: PageInput): Promise<Page | null>
  /** False when the page is missing; null when the new slug is taken. */
  update(storeId: string, id: string, input: PageInput): Promise<boolean | null>
  remove(storeId: string, id: string): Promise<void>
}
