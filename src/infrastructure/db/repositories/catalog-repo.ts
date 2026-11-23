import {
  and,
  asc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  ne,
  notInArray,
  type SQL,
} from 'drizzle-orm'
import type { CatalogRepo, SortOrder } from '@/modules/catalog'
import type { Db } from '../client'
import { brands, categories, products, productVariants } from '../schema'

const catCols = {
  id: categories.id,
  parentId: categories.parentId,
  name: categories.name,
  slug: categories.slug,
  sortOrder: categories.sortOrder,
  archived: categories.archived,
  seoTitle: categories.seoTitle,
  seoDescription: categories.seoDescription,
}
const { storeId, createdAt, updatedAt, ...prodCols } = getTableColumns(products)
const brandCols = {
  id: brands.id,
  name: brands.name,
  slug: brands.slug,
  logoId: brands.logoId,
  archived: brands.archived,
}
const { storeId: _s, sortOrder: _o, ...variantCols } = getTableColumns(productVariants)
type SlugTable = typeof categories | typeof products | typeof brands

const taken = async (
  db: Db,
  table: SlugTable,
  storeId: string,
  slug: string,
  exceptId?: string,
) => {
  const where = [
    eq(table.storeId, storeId),
    eq(table.slug, slug),
    ...(exceptId ? [ne(table.id, exceptId)] : []),
  ]
  return (
    (
      await db
        .select({ id: table.id })
        .from(table)
        .where(and(...where))
    ).length > 0
  )
}

const reorder = (
  db: Db,
  table: typeof categories | typeof products,
  storeId: string,
  orders: SortOrder[],
) =>
  db.transaction(async (tx) => {
    for (const o of orders) {
      await tx
        .update(table)
        .set({ sortOrder: o.sortOrder })
        .where(and(eq(table.storeId, storeId), eq(table.id, o.id)))
    }
  })

export const createCatalogRepo = (db: Db): CatalogRepo => ({
  listCategories: (storeId) =>
    db
      .select(catCols)
      .from(categories)
      .where(eq(categories.storeId, storeId))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  insertCategory: async (storeId, data) =>
    (
      await db
        .insert(categories)
        .values({ ...data, storeId })
        .returning(catCols)
    )[0]!,
  updateCategory: async (storeId, id, patch) => {
    await db
      .update(categories)
      .set(patch)
      .where(and(eq(categories.storeId, storeId), eq(categories.id, id)))
  },
  setCategoryOrder: (storeId, orders) => reorder(db, categories, storeId, orders),
  categorySlugTaken: (storeId, slug, exceptId) => taken(db, categories, storeId, slug, exceptId),
  listBrands: (storeId) =>
    db.select(brandCols).from(brands).where(eq(brands.storeId, storeId)).orderBy(asc(brands.name)),
  insertBrand: async (storeId, data) =>
    (
      await db
        .insert(brands)
        .values({ ...data, storeId })
        .returning(brandCols)
    )[0]!,
  updateBrand: async (storeId, id, patch) => {
    await db
      .update(brands)
      .set(patch)
      .where(and(eq(brands.storeId, storeId), eq(brands.id, id)))
  },
  brandSlugTaken: (storeId, slug, exceptId) => taken(db, brands, storeId, slug, exceptId),
  insertProduct: async (storeId, data) =>
    (
      await db
        .insert(products)
        .values({ ...data, storeId })
        .returning(prodCols)
    )[0]!,
  updateProduct: async (storeId, id, data) => {
    await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(products.storeId, storeId), eq(products.id, id)))
  },
  getProduct: async (storeId, id) =>
    (
      await db
        .select(prodCols)
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products.id, id)))
    )[0] ?? null,
  getProductBySlug: async (storeId, slug) =>
    (
      await db
        .select(prodCols)
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products.slug, slug)))
    )[0] ?? null,
  listProducts: (storeId, f) => {
    const where: SQL[] = [eq(products.storeId, storeId)]
    if (f.status) where.push(eq(products.status, f.status))
    if (f.categoryId) where.push(eq(products.categoryId, f.categoryId))
    if (f.brandId) where.push(eq(products.brandId, f.brandId))
    if (f.search) where.push(ilike(products.name, `%${f.search}%`))
    return db
      .select(prodCols)
      .from(products)
      .where(and(...where))
      .orderBy(asc(products.sortOrder), asc(products.name))
  },
  listVariants: (storeId, ids) =>
    db
      .select(variantCols)
      .from(productVariants)
      .where(and(eq(productVariants.storeId, storeId), inArray(productVariants.productId, ids)))
      .orderBy(asc(productVariants.sortOrder)),
  saveVariants: (storeId, productId, options, rows) =>
    db.transaction(async (tx) => {
      const mine = and(
        eq(productVariants.storeId, storeId),
        eq(productVariants.productId, productId),
      )
      const kept = rows.flatMap((r) => (r.id ? [r.id] : []))
      await tx.delete(productVariants).where(and(mine, notInArray(productVariants.id, kept)))
      for (const [
        sortOrder,
        { id, options: o, price, compareAtPrice, costPrice, stock, sku },
      ] of rows.entries()) {
        const v = { options: o, price, compareAtPrice, costPrice, stock, sku, sortOrder }
        if (id)
          await tx
            .update(productVariants)
            .set(v)
            .where(and(mine, eq(productVariants.id, id)))
        else await tx.insert(productVariants).values({ ...v, storeId, productId })
      }
      await tx
        .update(products)
        .set({ options, stock: rows.reduce((n, r) => n + r.stock, 0), updatedAt: new Date() })
        .where(and(eq(products.storeId, storeId), eq(products.id, productId)))
    }),
  setProductOrder: (storeId, orders) => reorder(db, products, storeId, orders),
  productSlugTaken: (storeId, slug, exceptId) => taken(db, products, storeId, slug, exceptId),
})
