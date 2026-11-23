import { beforeEach, describe, expect, it } from 'vitest'
import { createCatalog, optionsFromText, parseCsv, type Catalog } from '@/modules/catalog'
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

describe('variants (A1)', () => {
  const opts = (text: string) => optionsFromText(text)

  it('builds the matrix from options, keeps priced rows, and stock is the sum', async () => {
    const p = await catalog.createProduct(store, { name: 'Kurta', price: 1200, stock: 9 })
    await catalog.setOptions(store, p.id, opts('Size: S, M'))
    let vs = await catalog.listVariants(store, [p.id])
    expect(vs.map((v) => [v.options.Size, v.price, v.stock])).toEqual([
      ['S', 1200, 0],
      ['M', 1200, 0],
    ])
    await catalog.updateVariants(store, p.id, [
      { id: vs[1]!.id, price: 1500, compareAtPrice: 1800, costPrice: 700, stock: 4, sku: 'K-M' },
      {
        id: '00000000-0000-0000-0000-000000000000',
        price: 1,
        compareAtPrice: null,
        costPrice: 0,
        stock: 1,
        sku: null,
      },
    ])
    expect((await catalog.getProduct(store, p.id))?.stock).toBe(4)
    await catalog.setOptions(store, p.id, opts('Size: M, L\nColour: Red'))
    vs = await catalog.listVariants(store, [p.id])
    expect(vs.map((v) => [v.options.Size, v.options.Colour, v.price, v.stock])).toEqual([
      ['M', 'Red', 1200, 0],
      ['L', 'Red', 1200, 0],
    ])
    await catalog.setOptions(store, p.id, opts('Size: M, L'))
    await catalog.updateVariants(store, p.id, [
      {
        id: (await catalog.listVariants(store, [p.id]))[0]!.id,
        price: 1300,
        compareAtPrice: null,
        costPrice: 0,
        stock: 2,
        sku: null,
      },
    ])
    vs = await catalog.listVariants(store, [p.id])
    expect(vs.map((v) => [v.options.Size, v.price, v.stock])).toEqual([
      ['M', 1300, 2],
      ['L', 1200, 0],
    ])
    // A product edit keeps the variants' stock total and the options.
    await catalog.updateProduct(store, p.id, { name: 'Kurta', price: 1200, stock: 99 })
    expect(await catalog.getProduct(store, p.id)).toMatchObject({
      stock: 2,
      options: [{ name: 'Size', values: ['M', 'L'] }],
    })
    // Removing every option goes back to a plain product.
    await catalog.setOptions(store, p.id, [])
    expect(await catalog.listVariants(store, [p.id])).toEqual([])
    expect(await catalog.listVariants(other, [p.id])).toEqual([])
  })

  it('rejects bad variant prices and unknown products', async () => {
    const p = await catalog.createProduct(store, { name: 'Shirt', price: 800 })
    await catalog.setOptions(store, p.id, opts('Size: S'))
    const [v] = await catalog.listVariants(store, [p.id])
    await expect(
      catalog.updateVariants(store, p.id, [
        { id: v!.id, price: 900, compareAtPrice: 800, costPrice: 0, stock: 1, sku: null },
      ]),
    ).rejects.toThrow()
    const ghost = '00000000-0000-0000-0000-000000000000'
    await expect(catalog.setOptions(store, ghost, [])).rejects.toThrow('product.not_found')
    await expect(catalog.updateVariants(other, p.id, [])).rejects.toThrow('product.not_found')
  })
})

describe('size charts (A5)', () => {
  const rows = [
    ['Size', 'Chest'],
    ['M', '38'],
  ]

  it('creates, edits and deletes charts; a product uses its own chart, else its category one', async () => {
    const a = await catalog.createSizeChart(store, { name: 'Kurta', rows })
    const b = await catalog.createSizeChart(store, { name: 'Shirt', rows })
    await catalog.updateSizeChart(store, b.id, { name: 'Shirts', rows: [...rows, ['L', '40']] })
    expect((await catalog.listSizeCharts(store)).map((c) => [c.name, c.rows.length])).toEqual([
      ['Kurta', 2],
      ['Shirts', 3],
    ])
    expect(await catalog.listSizeCharts(other)).toEqual([])
    const cat = await catalog.createCategory(store, { name: 'Tops', sizeChartId: a.id })
    const own = await catalog.createProduct(store, {
      name: 'Own',
      price: 1,
      categoryId: cat.id,
      sizeChartId: b.id,
    })
    const inherit = await catalog.createProduct(store, {
      name: 'Inherit',
      price: 1,
      categoryId: cat.id,
    })
    const none = await catalog.createProduct(store, { name: 'None', price: 1 })
    expect((await catalog.sizeChartFor(store, own))?.name).toBe('Shirts')
    expect((await catalog.sizeChartFor(store, inherit))?.name).toBe('Kurta')
    expect(await catalog.sizeChartFor(store, none)).toBeNull()
    await catalog.deleteSizeChart(store, a.id)
    expect(
      await catalog.sizeChartFor(store, (await catalog.getProduct(store, inherit.id))!),
    ).toBeNull()
  })

  it('rejects charts from another store and bad tables', async () => {
    const foreign = await catalog.createSizeChart(other, { name: 'X', rows })
    await expect(
      catalog.createProduct(store, { name: 'P', price: 1, sizeChartId: foreign.id }),
    ).rejects.toThrow('size_chart.not_found')
    await expect(
      catalog.createCategory(store, { name: 'C', sizeChartId: foreign.id }),
    ).rejects.toThrow('size_chart.not_found')
    await expect(catalog.updateSizeChart(store, foreign.id, { name: 'Y', rows })).rejects.toThrow(
      'size_chart.not_found',
    )
    await expect(catalog.createSizeChart(store, { name: 'Z', rows: [['Size']] })).rejects.toThrow()
  })
})

describe('CSV import/export (A15)', () => {
  const head =
    'slug,name,variant,price,compare_at,cost,stock,sku,status,category,description,images'

  it('dry-runs with row errors, then creates and updates; variant rows set existing combos; exports back', async () => {
    const cat = await catalog.createCategory(store, { name: 'Drinks' })
    const kurta = await catalog.createProduct(store, {
      name: 'Kurta',
      slug: 'kurta',
      price: 1000,
      stock: 0,
    })
    await catalog.setOptions(store, kurta.id, optionsFromText('Size: M, L'))
    await catalog.createProduct(store, {
      name: 'Old',
      slug: 'old',
      price: 100,
      stock: 1,
      badge: { text: 'Hot', tone: 'danger' },
    })
    const good = [
      head,
      'tea,Tea,,120,,50,5,TEA-1,active,Drinks,"Fresh, strong",https://drive.google.com/file/d/abc/view',
      'old,Old renamed,,150,200,,2,,active,,,',
      'kurta,Kurta,Size=L,1300,,,4,K-L,,,,',
    ].join('\n')
    const bad = [
      head,
      'BAD,,,x,,,1,,,,,',
      'ghost,Ghost,Size=M,1,,,1,,,,,',
      'tea,Tea,,1,,,1,,,Nope,,',
      'kurta,Kurta,Size=XL,1,,,1,,,,,',
      'x,,,1,,,1,,,,,',
    ].join('\n')

    const dry = await catalog.importCsv(store, bad, false)
    expect(dry.ok).toBe(false)
    expect(dry.rows.map((r) => [r.line, r.errors])).toEqual([
      [2, ['slug', 'price']],
      [3, ['product']],
      [4, ['category']],
      [5, ['variant']],
      [6, ['name']],
    ])
    expect((await catalog.importCsv(store, bad, true)).ok).toBe(false)
    expect(await catalog.getProductBySlug(store, 'ghost')).toBeNull()

    const preview = await catalog.importCsv(store, good, false)
    expect(preview.rows.map((r) => r.action)).toEqual(['create', 'update', 'variant'])
    expect(await catalog.getProductBySlug(store, 'tea')).toBeNull()
    const done = await catalog.importCsv(store, good, true)
    expect(done.ok).toBe(true)
    const tea = (await catalog.getProductBySlug(store, 'tea'))!
    expect(tea).toMatchObject({
      name: 'Tea',
      price: 12000,
      costPrice: 5000,
      stock: 5,
      sku: 'TEA-1',
      categoryId: cat.id,
      description: 'Fresh, strong',
    })
    expect(done.rows[0]!.images).toEqual({
      productId: tea.id,
      links: ['https://drive.google.com/file/d/abc/view'],
    })
    expect(done.rows[1]!.images).toBeNull()
    expect(await catalog.getProductBySlug(store, 'old')).toMatchObject({
      name: 'Old renamed',
      price: 15000,
      compareAtPrice: 20000,
      badge: { text: 'Hot', tone: 'danger' },
    })
    const vs = await catalog.listVariants(store, [kurta.id])
    expect(vs.map((v) => [v.options.Size, v.price, v.stock, v.sku])).toEqual([
      ['M', 1000, 0, null],
      ['L', 130000, 4, 'K-L'],
    ])

    const out = parseCsv(await catalog.exportCsv(store))
    expect(out[0]!.join(',')).toBe(head)
    expect(out.find((r) => r[0] === 'kurta' && r[2] === 'Size=L')).toEqual([
      'kurta',
      'Kurta',
      'Size=L',
      '1300',
      '',
      '0',
      '4',
      'K-L',
      'draft',
      '',
      '',
      '',
    ])
    expect(out.find((r) => r[0] === 'tea')).toEqual([
      'tea',
      'Tea',
      '',
      '120',
      '',
      '50',
      '5',
      'TEA-1',
      'active',
      'Drinks',
      'Fresh, strong',
      '',
    ])
    expect(out.find((r) => r[0] === 'old')![4]).toBe('200')
    expect(await catalog.importCsv(store, '', false)).toEqual({ ok: false, rows: [] })
  })
})

describe('layout switch with demo packs (J3)', () => {
  it('counts, adds a demo pack once, hides and brings back mine, removes the demo, starts fresh', async () => {
    const live = await catalog.createProduct(store, { name: 'Mine', price: 100, status: 'active' })
    const draft = await catalog.createProduct(store, { name: 'Draft', price: 100 })
    expect(await catalog.demoCounts(store)).toEqual({ mine: 2, demo: 0, hidden: 0 })
    await catalog.addDemoPack(store, 'fashion')
    await catalog.addDemoPack(store, 'fashion')
    expect(await catalog.demoCounts(store)).toEqual({ mine: 2, demo: 3, hidden: 0 })
    expect((await catalog.listProducts(store, { status: 'active' })).map((p) => p.name)).toContain(
      'Jamdani Saree',
    )

    await catalog.hideMine(store)
    expect((await catalog.getProduct(store, live.id))?.status).toBe('draft')
    expect(await catalog.demoCounts(store)).toEqual({ mine: 2, demo: 3, hidden: 2 })
    await catalog.restoreMine(store)
    expect((await catalog.getProduct(store, live.id))?.status).toBe('active')
    expect((await catalog.getProduct(store, draft.id))?.status).toBe('draft')
    expect((await catalog.demoCounts(store)).hidden).toBe(0)

    await catalog.removeDemo(store)
    expect(await catalog.demoCounts(store)).toEqual({ mine: 2, demo: 0, hidden: 0 })
    await catalog.addDemoPack(store, 'grocery')
    await catalog.startFresh(store)
    expect(await catalog.demoCounts(store)).toEqual({ mine: 0, demo: 3, hidden: 0 })
    expect(await catalog.demoCounts(other)).toEqual({ mine: 0, demo: 0, hidden: 0 })
  })
})
