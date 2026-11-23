import { DomainError, validate } from '@/modules/shared'
import {
  assertNoCycle,
  brandInput,
  categoryInput,
  productInput,
  toSortOrders,
  type BrandInput,
  type CategoryInput,
  type ProductInput,
} from '../domain/rules'
import { sizeChartInput, type SizeChartInput } from '../domain/size-chart'
import { uniqueSlug } from '../domain/slug'
import {
  mergeMatrix,
  productOptions,
  variantInput,
  type ProductOptions,
  type VariantData,
} from '../domain/variants'
import type { CatalogRepo, Product, ProductFilter } from './ports'

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

  const brandSlug = (storeId: string, name: string, exceptId?: string) =>
    uniqueSlug(name, (s) => repo.brandSlugTaken(storeId, s, exceptId), shortId)
  const assertBrand = async (storeId: string, brandId: string | null) => {
    if (brandId && !(await repo.listBrands(storeId)).some((b) => b.id === brandId)) {
      throw new DomainError('brand.not_found')
    }
  }

  const mustProduct = async (storeId: string, id: string): Promise<Product> =>
    (await repo.getProduct(storeId, id)) ?? Promise.reject(new DomainError('product.not_found'))

  const assertChart = async (storeId: string, chartId: string | null) => {
    if (chartId && !(await repo.listSizeCharts(storeId)).some((c) => c.id === chartId)) {
      throw new DomainError('size_chart.not_found')
    }
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
      await assertChart(storeId, d.sizeChartId)
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
      await assertChart(storeId, d.sizeChartId)
      await repo.updateCategory(storeId, id, {
        ...d,
        slug: await categorySlug(storeId, d.name, d.slug, id),
      })
    },

    archiveCategory: (storeId: string, id: string) =>
      repo.updateCategory(storeId, id, { archived: true }),
    reorderCategories: (storeId: string, ids: string[]) =>
      repo.setCategoryOrder(storeId, toSortOrders(ids)),

    listSizeCharts: (storeId: string) => repo.listSizeCharts(storeId),
    async createSizeChart(storeId: string, input: SizeChartInput) {
      return repo.insertSizeChart(storeId, validate(sizeChartInput, input))
    },
    async updateSizeChart(storeId: string, id: string, input: SizeChartInput) {
      const d = validate(sizeChartInput, input)
      await assertChart(storeId, id)
      await repo.updateSizeChart(storeId, id, d)
    },
    deleteSizeChart: (storeId: string, id: string) => repo.deleteSizeChart(storeId, id),
    // The product's own chart, else its category's.
    async sizeChartFor(storeId: string, p: Product) {
      const cat = (await repo.listCategories(storeId)).find((c) => c.id === p.categoryId)
      const id = p.sizeChartId ?? cat?.sizeChartId
      return (await repo.listSizeCharts(storeId)).find((c) => c.id === id) ?? null
    },

    listBrands: (storeId: string) => repo.listBrands(storeId),
    async createBrand(storeId: string, input: BrandInput) {
      const d = validate(brandInput, input)
      return repo.insertBrand(storeId, {
        name: d.name,
        slug: await brandSlug(storeId, d.name),
        // The logo is uploaded once the brand exists (edit form).
        logoId: null,
      })
    },
    async updateBrand(storeId: string, id: string, input: BrandInput) {
      const d = validate(brandInput, input)
      await assertBrand(storeId, id)
      await repo.updateBrand(storeId, id, {
        name: d.name,
        slug: await brandSlug(storeId, d.name, id),
        ...(d.logoId !== undefined && { logoId: d.logoId }),
      })
    },
    archiveBrand: (storeId: string, id: string) =>
      repo.updateBrand(storeId, id, { archived: true }),
    // Storefront brand page: archived brands are gone for shoppers.
    async getBrandBySlug(storeId: string, slug: string) {
      return (await repo.listBrands(storeId)).find((b) => b.slug === slug && !b.archived) ?? null
    },

    async createProduct(storeId: string, input: ProductInput) {
      const d = validate(productInput, input)
      await assertCategory(storeId, d.categoryId)
      await assertBrand(storeId, d.brandId)
      await assertChart(storeId, d.sizeChartId)
      return repo.insertProduct(storeId, { ...d, slug: await productSlug(storeId, d.name, d.slug) })
    },

    async updateProduct(storeId: string, id: string, input: ProductInput) {
      const d = validate(productInput, input)
      const current = await mustProduct(storeId, id)
      await assertCategory(storeId, d.categoryId)
      await assertBrand(storeId, d.brandId)
      await assertChart(storeId, d.sizeChartId)
      await repo.updateProduct(storeId, id, {
        ...d,
        // With variants, stock lives on the variants; the product keeps their total.
        stock: current.options.length > 0 ? current.stock : d.stock,
        slug: await productSlug(storeId, d.name, d.slug, id),
      })
    },

    listVariants: (storeId: string, productIds: string[]) => repo.listVariants(storeId, productIds),

    // Changing options rebuilds the combinations; rows already priced are kept.
    async setOptions(storeId: string, productId: string, input: ProductOptions) {
      const options = validate(productOptions, input)
      const p = await mustProduct(storeId, productId)
      const rows = mergeMatrix(options, await repo.listVariants(storeId, [productId]), {
        productId,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        costPrice: p.costPrice,
        stock: 0,
        sku: null,
      })
      await repo.saveVariants(storeId, productId, options, rows)
    },

    /** Prices/stock per variant; ids that are not this product's variants are ignored. */
    async updateVariants(
      storeId: string,
      productId: string,
      patches: (Omit<VariantData, 'options'> & { id: string })[],
    ) {
      const p = await mustProduct(storeId, productId)
      const byId = new Map(patches.map((x) => [x.id, x]))
      const rows = (await repo.listVariants(storeId, [productId])).map((v) => ({
        id: v.id,
        ...validate(variantInput, { ...v, ...byId.get(v.id), options: v.options }),
      }))
      await repo.saveVariants(storeId, productId, p.options, rows)
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
