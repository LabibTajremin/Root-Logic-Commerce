import type { ProductData } from '../domain/rules'
import type { ProductOptions, VariantData } from '../domain/variants'

export type Category = {
  id: string
  parentId: string | null
  name: string
  slug: string
  sortOrder: number
  archived: boolean
  seoTitle: string | null
  seoDescription: string | null
  sizeChartId: string | null
}
export type SizeChart = { id: string; name: string; rows: string[][] }
export type CategoryData = Omit<Category, 'id' | 'sortOrder' | 'archived'>
export type Brand = {
  id: string
  name: string
  slug: string
  logoId: string | null
  archived: boolean
}
export type Product = Omit<ProductData, 'slug'> & {
  id: string
  slug: string
  sortOrder: number
  options: ProductOptions
  createdAt: Date
}
/** What a product create/edit writes: options and variants are saved on their own. */
export type ProductWrite = Omit<Product, 'id' | 'sortOrder' | 'options' | 'createdAt'>
export type Variant = VariantData & { id: string; productId: string }
export type VariantWrite = VariantData & { id?: string }
export type ProductFilter = {
  status?: Product['status']
  categoryId?: string
  brandId?: string
  search?: string
}
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
  listSizeCharts(storeId: string): Promise<SizeChart[]>
  insertSizeChart(storeId: string, data: Omit<SizeChart, 'id'>): Promise<SizeChart>
  updateSizeChart(storeId: string, id: string, data: Omit<SizeChart, 'id'>): Promise<void>
  deleteSizeChart(storeId: string, id: string): Promise<void>
  listBrands(storeId: string): Promise<Brand[]>
  insertBrand(storeId: string, data: Omit<Brand, 'id' | 'archived'>): Promise<Brand>
  updateBrand(storeId: string, id: string, patch: Partial<Omit<Brand, 'id'>>): Promise<void>
  brandSlugTaken(storeId: string, slug: string, exceptId?: string): Promise<boolean>
  insertProduct(storeId: string, data: ProductWrite): Promise<Product>
  updateProduct(storeId: string, id: string, data: ProductWrite): Promise<void>
  listVariants(storeId: string, productIds: string[]): Promise<Variant[]>
  /** Atomic: options + the full variant list (rows without id are new) + stock = sum. */
  saveVariants(
    storeId: string,
    productId: string,
    options: ProductOptions,
    rows: VariantWrite[],
  ): Promise<void>
  getProduct(storeId: string, id: string): Promise<Product | null>
  getProductBySlug(storeId: string, slug: string): Promise<Product | null>
  listProducts(storeId: string, filter: ProductFilter): Promise<Product[]>
  setProductOrder(storeId: string, orders: SortOrder[]): Promise<void>
  /** Units sold per product (confirmed and later, not cancelled or returned). */
  soldCounts(storeId: string): Promise<Map<string, number>>
  /** Products that shared confirmed orders with this one, most often first. */
  coPurchased(storeId: string, productId: string): Promise<string[]>
  productSlugTaken(storeId: string, slug: string, exceptId?: string): Promise<boolean>
}
