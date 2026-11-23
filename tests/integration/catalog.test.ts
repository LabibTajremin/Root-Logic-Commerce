import { beforeEach, describe, expect, it } from 'vitest'
import { createCatalog, type Catalog } from '@/modules/catalog'
import { createCatalogRepo } from '@/infrastructure/db/repositories/catalog-repo'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

let catalog: Catalog
let store: string
let other: string

beforeEach(async () => {
  const db = await createTestDb()
  catalog = createCatalog({ repo: createCatalogRepo(db), shortId: () => 'abc1' })
  store = await seedStore(db)
  other = await seedStore(db, 'other')
})

describe('categories', () => {
  it('creates a tree with unique slugs and reorders it', async () => {
    const rice = await catalog.createCategory(store, { name: 'চাল' })
    const rice2 = await catalog.createCategory(store, { name: 'Chal' })
    const sub = await catalog.createCategory(store, { name: 'Miniket', parentId: rice.id })
    expect([rice.slug, rice2.slug, sub.parentId]).toEqual(['chal', 'chal-2', rice.id])
    await catalog.reorderCategories(store, [sub.id, rice2.id, rice.id])
    expect((await catalog.listCategories(store)).map((c) => c.name)).toEqual([
      'Miniket',
      'Chal',
      'চাল',
    ])
    expect(await catalog.listCategories(other)).toEqual([])
  })

  it('moves, renames and archives a category', async () => {
    const a = await catalog.createCategory(store, { name: 'A' })
    const b = await catalog.createCategory(store, { name: 'B' })
    await catalog.updateCategory(store, b.id, { name: 'B', parentId: a.id })
    await catalog.updateCategory(store, a.id, { name: 'A', slug: 'a' })
    await catalog.archiveCategory(store, b.id)
    const all = await catalog.listCategories(store)
    expect(all.find((c) => c.id === b.id)).toMatchObject({
      parentId: a.id,
      archived: true,
      slug: 'b',
    })
    expect(all.find((c) => c.id === a.id)?.slug).toBe('a')
  })

  it('rejects cycles, foreign parents, unknown ids and invalid input', async () => {
    const a = await catalog.createCategory(store, { name: 'A' })
    const b = await catalog.createCategory(store, { name: 'B', parentId: a.id })
    const foreign = await catalog.createCategory(other, { name: 'X' })
    await expect(
      catalog.updateCategory(store, a.id, { name: 'A', parentId: b.id }),
    ).rejects.toThrow('category.cycle')
    await expect(
      catalog.createCategory(store, { name: 'C', parentId: foreign.id }),
    ).rejects.toThrow('category.parent_not_found')
    await expect(catalog.updateCategory(store, foreign.id, { name: 'X' })).rejects.toThrow(
      'category.not_found',
    )
    await expect(catalog.createCategory(store, { name: '' })).rejects.toMatchObject({
      code: 'validation',
    })
  })
})

describe('products', () => {
  it('creates, updates, filters, reorders and exposes only active products to the storefront', async () => {
    const cat = await catalog.createCategory(store, { name: 'Bags' })
    const tote = await catalog.createProduct(store, {
      name: 'Canvas Tote',
      price: 89000,
      compareAtPrice: 99900,
      categoryId: cat.id,
      status: 'active',
      stock: 4,
    })
    const draft = await catalog.createProduct(store, { name: 'Canvas Tote', price: 100 })
    expect([tote.slug, draft.slug, tote.costPrice]).toEqual(['canvas-tote', 'canvas-tote-2', 0])

    await catalog.updateProduct(store, draft.id, {
      name: 'Straw Bag',
      price: 129000,
      costPrice: 70000,
      status: 'active',
    })
    expect(await catalog.getProduct(store, draft.id)).toMatchObject({
      slug: 'straw-bag',
      costPrice: 70000,
    })

    expect((await catalog.listProducts(store, { categoryId: cat.id })).map((p) => p.name)).toEqual([
      'Canvas Tote',
    ])
    expect(
      (await catalog.listProducts(store, { search: 'straw', status: 'active' })).map((p) => p.name),
    ).toEqual(['Straw Bag'])
    await catalog.reorderProducts(store, [draft.id, tote.id])
    expect((await catalog.listProducts(store)).map((p) => p.name)).toEqual([
      'Straw Bag',
      'Canvas Tote',
    ])

    expect(await catalog.getActiveProduct(store, 'canvas-tote')).toMatchObject({ id: tote.id })
    await catalog.updateProduct(store, tote.id, {
      name: 'Canvas Tote',
      price: 89000,
      status: 'draft',
      slug: 'canvas-tote',
    })
    expect(await catalog.getActiveProduct(store, 'canvas-tote')).toBeNull()
    expect(await catalog.getActiveProduct(store, 'missing')).toBeNull()
    expect(await catalog.getActiveProduct(other, 'straw-bag')).toBeNull()
  })

  it('rejects unknown products and categories from another store', async () => {
    const foreign = await catalog.createCategory(other, { name: 'X' })
    await expect(
      catalog.createProduct(store, { name: 'P', price: 1, categoryId: foreign.id }),
    ).rejects.toThrow('category.not_found')
    await expect(
      catalog.updateProduct(store, '00000000-0000-0000-0000-000000000000', { name: 'P', price: 1 }),
    ).rejects.toThrow('product.not_found')
  })
})

describe('brands (A2)', () => {
  it('creates, renames, sets a logo, archives and filters products by brand', async () => {
    const a = await catalog.createBrand(store, { name: 'Aarong' })
    const b = await catalog.createBrand(store, { name: 'Aarong' })
    expect([a.slug, b.slug, a.logoId]).toEqual(['aarong', 'aarong-2', null])
    await catalog.updateBrand(store, b.id, { name: 'Bibi' })
    await catalog.updateBrand(store, a.id, { name: 'Aarong', logoId: null })
    await catalog.archiveBrand(store, a.id)
    expect((await catalog.listBrands(store)).map((x) => [x.name, x.slug, x.archived])).toEqual([
      ['Aarong', 'aarong', true],
      ['Bibi', 'bibi', false],
    ])
    expect(await catalog.listBrands(other)).toEqual([])
    const p = await catalog.createProduct(store, { name: 'Saree', price: 1, brandId: b.id })
    await catalog.createProduct(store, { name: 'Plain', price: 1 })
    expect((await catalog.listProducts(store, { brandId: b.id })).map((x) => x.id)).toEqual([p.id])
    expect(await catalog.getBrandBySlug(store, 'bibi')).toMatchObject({ id: b.id })
    expect(await catalog.getBrandBySlug(store, 'aarong')).toBeNull()
    expect(await catalog.getBrandBySlug(other, 'bibi')).toBeNull()
  })

  it('rejects brands from another store and unknown brands', async () => {
    const foreign = await catalog.createBrand(other, { name: 'X' })
    await expect(
      catalog.createProduct(store, { name: 'P', price: 1, brandId: foreign.id }),
    ).rejects.toThrow('brand.not_found')
    await expect(catalog.updateBrand(store, foreign.id, { name: 'Y' })).rejects.toThrow(
      'brand.not_found',
    )
    await expect(catalog.createBrand(store, { name: ' ' })).rejects.toThrow()
  })
})
