import type { ProductData } from '../domain/rules'

export type Category = {
  id: string
  parentId: string | null
  name: string
  slug: string
  sortOrder: number
  archived: boolean
  seoTitle: string | null
  seoDescription: string | null
}
export type CategoryData = Omit<Category, 'id' | 'sortOrder' | 'archived'>
export type Product = Omit<ProductData, 'slug'> & { id: string; slug: string; sortOrder: number }
export type ProductFilter = { status?: Product['status']; categoryId?: string; search?: string }
export type SortOrder = { id: string; sortOrder: number }

export type CatalogRepo = {
  listCategories(storeId: string): Promise<Category[]>
  insertCategory(storeId: string, data: CategoryData): Promise<Category>
  updateCategory(
    storeId: string,
    id: string,
    patch: Partial<CategoryData & { archived: boolean }>,
  ): Promise<void>
  setCategoryOrder(storeId: string, orders: SortOrder[]): Promise<void>
  categorySlugTaken(storeId: string, slug: string, exceptId?: string): Promise<boolean>
  insertProduct(storeId: string, data: Omit<Product, 'id' | 'sortOrder'>): Promise<Product>
  updateProduct(storeId: string, id: string, data: Omit<Product, 'id' | 'sortOrder'>): Promise<void>
  getProduct(storeId: string, id: string): Promise<Product | null>
  getProductBySlug(storeId: string, slug: string): Promise<Product | null>
  listProducts(storeId: string, filter: ProductFilter): Promise<Product[]>
  setProductOrder(storeId: string, orders: SortOrder[]): Promise<void>
  productSlugTaken(storeId: string, slug: string, exceptId?: string): Promise<boolean>
}
