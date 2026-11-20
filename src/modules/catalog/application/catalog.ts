import { DomainError, validate } from '@/modules/shared'
import {
  assertNoCycle,
  categoryInput,
  productInput,
  toSortOrders,
  type CategoryInput,
  type ProductInput,
} from '../domain/rules'
import { uniqueSlug } from '../domain/slug'
import type { CatalogRepo, ProductFilter } from './ports'

type Deps = { repo: CatalogRepo; shortId: () => string }

export const createCatalog = ({ repo, shortId }: Deps) => {
  const categorySlug = (storeId: string, name: string, wanted?: string, exceptId?: string) =>
    uniqueSlug(wanted ?? name, (s) => repo.categorySlugTaken(storeId, s, exceptId), shortId)
  const productSlug = (storeId: string, name: string, wanted?: string, exceptId?: string) =>
    uniqueSlug(wanted ?? name, (s) => repo.productSlugTaken(storeId, s, exceptId), shortId)

  // Parent must belong to the same store — the tree is never shared across tenants.
  const assertParent = async (storeId: string, id: string | null, parentId: string | null) => {
    if (!parentId) return
    const all = await repo.listCategories(storeId)
    if (!all.some((c) => c.id === parentId)) throw new DomainError('category.parent_not_found')
    if (id) assertNoCycle(all, id, parentId)
  }

  const assertCategory = async (storeId: string, categoryId: string | null) => {
    if (categoryId && !(await repo.listCategories(storeId)).some((c) => c.id === categoryId)) {
      throw new DomainError('category.not_found')
    }
  }

  return {
    listCategories: (storeId: string) => repo.listCategories(storeId),

    async createCategory(storeId: string, input: CategoryInput) {
      const d = validate(categoryInput, input)
      await assertParent(storeId, null, d.parentId)
      return repo.insertCategory(storeId, {
        ...d,
        slug: await categorySlug(storeId, d.name, d.slug),
      })
    },

    async updateCategory(storeId: string, id: string, input: CategoryInput) {
      const d = validate(categoryInput, input)
      if (!(await repo.listCategories(storeId)).some((c) => c.id === id))
        throw new DomainError('category.not_found')
      await assertParent(storeId, id, d.parentId)
      await repo.updateCategory(storeId, id, {
        ...d,
        slug: await categorySlug(storeId, d.name, d.slug, id),
      })
    },

    archiveCategory: (storeId: string, id: string) =>
      repo.updateCategory(storeId, id, { archived: true }),
    reorderCategories: (storeId: string, ids: string[]) =>
      repo.setCategoryOrder(storeId, toSortOrders(ids)),

    async createProduct(storeId: string, input: ProductInput) {
      const d = validate(productInput, input)
      await assertCategory(storeId, d.categoryId)
      return repo.insertProduct(storeId, { ...d, slug: await productSlug(storeId, d.name, d.slug) })
    },

    async updateProduct(storeId: string, id: string, input: ProductInput) {
      const d = validate(productInput, input)
      if (!(await repo.getProduct(storeId, id))) throw new DomainError('product.not_found')
      await assertCategory(storeId, d.categoryId)
      await repo.updateProduct(storeId, id, {
        ...d,
        slug: await productSlug(storeId, d.name, d.slug, id),
      })
    },

    reorderProducts: (storeId: string, ids: string[]) =>
      repo.setProductOrder(storeId, toSortOrders(ids)),
    listProducts: (storeId: string, filter: ProductFilter = {}) =>
      repo.listProducts(storeId, filter),
    getProduct: (storeId: string, id: string) => repo.getProduct(storeId, id),

    // Storefront only ever sees active products.
    async getActiveProduct(storeId: string, slug: string) {
      const p = await repo.getProductBySlug(storeId, slug)
      return p?.status === 'active' ? p : null
    },
  }
}

export type Catalog = ReturnType<typeof createCatalog>
