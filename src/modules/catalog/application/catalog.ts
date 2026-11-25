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
import { csvColumns, parseCsv, readRow, toCsv } from '../domain/csv'
import { demoPacks } from '../domain/demo-packs'
import { pickBoughtTogether, pickRelated } from '../domain/related'
import { sizeChartInput, type SizeChartInput } from '../domain/size-chart'
import { uniqueSlug } from '../domain/slug'
import {
  mergeMatrix,
  variantLabel,
  productOptions,
  variantInput,
  type ProductOptions,
  type VariantData,
} from '../domain/variants'
import type { CatalogRepo, Product, ProductFilter } from './ports'

/** F3: product changes go to the activity log (before → after). */
export type CatalogAudit = (
  storeId: string,
  action:
    | 'product.create'
    | 'product.update'
    | 'product.variants'
    | 'catalog.hide_mine'
    | 'catalog.restore_mine'
    | 'catalog.remove_demo'
    | 'catalog.start_fresh',
  before: unknown,
  after: unknown,
) => Promise<void>
type Deps = { repo: CatalogRepo; shortId: () => string; audit: CatalogAudit }

export const createCatalog = ({ repo, shortId, audit }: Deps) => {
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
      const p = await repo.insertProduct(storeId, {
        ...d,
        slug: await productSlug(storeId, d.name, d.slug),
      })
      await audit(storeId, 'product.create', null, p)
      return p
    },

    async updateProduct(storeId: string, id: string, input: ProductInput) {
      const d = validate(productInput, input)
      const current = await mustProduct(storeId, id)
      await assertCategory(storeId, d.categoryId)
      await assertBrand(storeId, d.brandId)
      await assertChart(storeId, d.sizeChartId)
      const next = {
        ...d,
        // With variants, stock lives on the variants; the product keeps their total.
        stock: current.options.length > 0 ? current.stock : d.stock,
        slug: await productSlug(storeId, d.name, d.slug, id),
      }
      await repo.updateProduct(storeId, id, next)
      await audit(storeId, 'product.update', current, { ...current, ...next })
    },

    listVariants: (storeId: string, productIds: string[]) => repo.listVariants(storeId, productIds),

    // Changing options rebuilds the combinations; rows already priced are kept.
    async setOptions(storeId: string, productId: string, input: ProductOptions) {
      const options = validate(productOptions, input)
      const p = await mustProduct(storeId, productId)
      const before = await repo.listVariants(storeId, [productId])
      const rows = mergeMatrix(options, before, {
        productId,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        costPrice: p.costPrice,
        stock: 0,
        sku: null,
      })
      await repo.saveVariants(storeId, productId, options, rows)
      await audit(
        storeId,
        'product.variants',
        { id: productId, options: p.options },
        { id: productId, options },
      )
    },

    /** Prices/stock per variant; ids that are not this product's variants are ignored. */
    async updateVariants(
      storeId: string,
      productId: string,
      patches: (Omit<VariantData, 'options'> & { id: string })[],
    ) {
      const p = await mustProduct(storeId, productId)
      const byId = new Map(patches.map((x) => [x.id, x]))
      const before = await repo.listVariants(storeId, [productId])
      const rows = before.map((v) => ({
        id: v.id,
        ...validate(variantInput, { ...v, ...byId.get(v.id), options: v.options }),
      }))
      await repo.saveVariants(storeId, productId, p.options, rows)
      // F3: CSV variant rows land here too, so imports are logged line by line.
      await audit(
        storeId,
        'product.variants',
        { id: productId, variants: before },
        { id: productId, variants: rows },
      )
    },

    /** A8: "You may also like" and "Frequently bought together" for a product page. */
    async recommendationsFor(storeId: string, p: Product) {
      const [all, co] = await Promise.all([
        repo.listProducts(storeId, { status: 'active' }),
        repo.coPurchased(storeId, p.id),
      ])
      return { related: pickRelated(p, all, 4), together: pickBoughtTogether(p, all, co, 3) }
    },

    getProductBySlug: (storeId: string, slug: string) => repo.getProductBySlug(storeId, slug),

    /** J3: what a layout switch would touch — the owner's products, demo ones, hidden ones. */
    async demoCounts(storeId: string) {
      const all = await repo.listProducts(storeId, {})
      return {
        mine: all.filter((p) => !p.demo).length,
        demo: all.filter((p) => p.demo).length,
        hidden: all.filter((p) => p.parkedStatus !== null).length,
      }
    },
    /** Adds a niche's sample products (once — names already there are skipped). */
    async addDemoPack(storeId: string, pack: keyof typeof demoPacks) {
      const have = new Set(
        (await repo.listProducts(storeId, {})).filter((p) => p.demo).map((p) => p.name),
      )
      const ids = []
      for (const d of demoPacks[pack].filter((x) => !have.has(x.name)))
        ids.push((await this.createProduct(storeId, { ...d, stock: 10, status: 'active' })).id)
      await repo.markDemo(storeId, ids)
    },
    /** Hide mine, show demo: the owner's products turn draft; nothing is deleted. */
    // F3: each bulk move of a layout switch is logged as one entry.
    async hideMine(storeId: string) {
      await repo.parkMine(storeId)
      await audit(storeId, 'catalog.hide_mine', null, null)
    },
    async restoreMine(storeId: string) {
      await repo.unparkMine(storeId)
      await audit(storeId, 'catalog.restore_mine', null, null)
    },
    async removeDemo(storeId: string) {
      await repo.deleteProducts(storeId, true)
      await audit(storeId, 'catalog.remove_demo', null, null)
    },
    /** Start fresh: the owner's own products are deleted (the page asks twice). */
    async startFresh(storeId: string) {
      await repo.deleteProducts(storeId, false)
      await audit(storeId, 'catalog.start_fresh', null, null)
    },

    /**
     * A15 import: every row is checked first (dry run); `apply` writes only a sheet with
     * no errors. Product rows create or update by slug (fields not in the sheet are kept);
     * variant rows set price/stock of a combination the product already has. Image links
     * of newly created products are handed back for the media module to attach.
     */
    async importCsv(storeId: string, text: string, apply: boolean) {
      const [head = [], ...body] = parseCsv(text)
      const [products, cats] = await Promise.all([
        repo.listProducts(storeId, {}),
        repo.listCategories(storeId),
      ])
      const bySlug = new Map(products.map((p) => [p.slug, p]))
      const variants = await repo.listVariants(
        storeId,
        products.map((p) => p.id),
      )
      const plan = body.map((cells, i) => {
        const line = i + 2
        const r = readRow(head, cells)
        if (!r.ok) return { line, action: null, errors: r.errors, run: null }
        const v = r.value
        const p = bySlug.get(v.slug)
        if (v.variant) {
          const label = p && variantLabel(p.options, v.variant)
          const hit = variants.find(
            (x) => x.productId === p?.id && variantLabel(p.options, x.options) === label,
          )
          const errors = !p ? ['product'] : !hit ? ['variant'] : []
          const run = async () => {
            await this.updateVariants(storeId, p!.id, [
              {
                id: hit!.id,
                price: v.price,
                compareAtPrice: v.compareAtPrice,
                costPrice: v.costPrice,
                stock: v.stock,
                sku: v.sku,
              },
            ])
            return null
          }
          return { line, action: 'variant' as const, errors, run }
        }
        const cat = v.category ? cats.find((c) => c.name === v.category) : null
        const input = {
          ...(p && {
            ...p,
            id: undefined,
            sortOrder: undefined,
            options: undefined,
            createdAt: undefined,
          }),
          name: v.name,
          slug: v.slug,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          costPrice: v.costPrice,
          stock: v.stock,
          sku: v.sku,
          status: v.status,
          categoryId: cat ? cat.id : (p?.categoryId ?? null),
          description: v.description || (p?.description ?? ''),
        }
        const checked = productInput.safeParse(input)
        const errors = [
          ...(cat === undefined ? ['category'] : []),
          ...(checked.success
            ? []
            : [...new Set(checked.error.issues.map((x) => String(x.path[0])))]),
        ]
        const run = async () =>
          p
            ? (await this.updateProduct(storeId, p.id, input), null)
            : { productId: (await this.createProduct(storeId, input)).id, links: v.images }
        return { line, action: p ? ('update' as const) : ('create' as const), errors, run }
      })
      const ok = plan.length > 0 && plan.every((x) => x.errors.length === 0)
      const rows = []
      for (const { run, ...row } of plan)
        rows.push({ ...row, images: ok && apply ? await run!() : null })
      return { ok, rows }
    },

    /** A15 export: one row per product, then one per variant. */
    async exportCsv(storeId: string) {
      const [products, cats] = await Promise.all([
        repo.listProducts(storeId, {}),
        repo.listCategories(storeId),
      ])
      const variants = await repo.listVariants(
        storeId,
        products.map((p) => p.id),
      )
      const taka = (m: number | null) => (m === null ? '' : String(m / 100))
      const rows = products.flatMap((p) => [
        [
          p.slug,
          p.name,
          '',
          taka(p.price),
          taka(p.compareAtPrice),
          taka(p.costPrice),
          String(p.stock),
          p.sku ?? '',
          p.status,
          cats.find((c) => c.id === p.categoryId)?.name ?? '',
          p.description,
          '',
        ],
        ...variants
          .filter((v) => v.productId === p.id)
          .map((v) => [
            p.slug,
            p.name,
            p.options.map((o) => `${o.name}=${v.options[o.name]}`).join(' | '),
            taka(v.price),
            taka(v.compareAtPrice),
            taka(v.costPrice),
            String(v.stock),
            v.sku ?? '',
            p.status,
            '',
            '',
            '',
          ]),
      ])
      return toCsv([[...csvColumns], ...rows])
    },

    /** A11: what a list filters and sorts on — cheapest variant price, values, units sold. */
    async listingItems(storeId: string, products: Product[]) {
      const [variants, sold] = await Promise.all([
        repo.listVariants(
          storeId,
          products.map((p) => p.id),
        ),
        repo.soldCounts(storeId),
      ])
      return products.map((p) => {
        const prices = variants.filter((v) => v.productId === p.id).map((v) => v.price)
        return {
          id: p.id,
          product: p,
          price: prices.length > 0 ? Math.min(...prices) : p.price,
          inStock: p.stock > 0,
          brandId: p.brandId,
          options: Object.fromEntries(p.options.map((o) => [o.name, o.values])),
          sold: sold.get(p.id) ?? 0,
          createdAt: p.createdAt,
          sortOrder: p.sortOrder,
        }
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
