import { toCsv } from './csv'
import { variantLabel, type ProductOptions, type VariantOptions } from './variants'

/** H10: what a catalog feed needs about one active product. */
export type FeedProduct = {
  id: string
  slug: string
  name: string
  description: string
  price: number
  compareAtPrice: number | null
  stock: number
  sku: string | null
  options: ProductOptions
  brand: string
  category: string
  images: string[]
  variants: {
    id: string
    options: VariantOptions
    price: number
    compareAtPrice: number | null
    stock: number
    sku: string | null
  }[]
}

export type FeedItem = {
  id: string
  groupId: string | null
  title: string
  description: string
  link: string
  image: string
  extraImages: string[]
  price: string
  salePrice: string | null
  availability: 'in stock' | 'out of stock'
  brand: string
  productType: string
}

const amount = (minor: number, currency: string) => `${(minor / 100).toFixed(2)} ${currency}`

/**
 * One item per product, or per variant (sharing an item group), in the shape both Meta and
 * Google catalogs read. A product without a photo is left out: neither catalog accepts it.
 */
export const feedItems = (products: FeedProduct[], base: string, currency: string): FeedItem[] =>
  products
    .filter((p) => p.images.length > 0)
    .flatMap((p) => {
      const item = (
        x: { id: string; price: number; compareAtPrice: number | null; stock: number },
        title: string,
        groupId: string | null,
      ): FeedItem => ({
        id: x.id,
        groupId,
        title,
        description: p.description.trim() || p.name,
        link: `${base}/p/${p.slug}`,
        image: p.images[0]!,
        extraImages: p.images.slice(1, 10),
        // A compare-at price is the regular price; the selling price is then the sale price.
        price: amount(x.compareAtPrice ?? x.price, currency),
        salePrice: x.compareAtPrice === null ? null : amount(x.price, currency),
        availability: x.stock > 0 ? 'in stock' : 'out of stock',
        brand: p.brand,
        productType: p.category,
      })
      if (p.variants.length === 0) return [item({ ...p, id: p.sku ?? p.id }, p.name, null)]
      return p.variants.map((v) =>
        item(
          { ...v, id: v.sku ?? v.id },
          `${p.name} (${variantLabel(p.options, v.options)})`,
          p.sku ?? p.id,
        ),
      )
    })

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Google Merchant RSS 2.0 — Meta Commerce Manager reads the same file. */
export const feedXml = (items: FeedItem[], shop: { title: string; link: string }) => {
  const tag = (name: string, value: string | null) =>
    value === null || value === '' ? '' : `<g:${name}>${xml(value)}</g:${name}>`
  const entries = items.map(
    (i) =>
      `<item>${tag('id', i.id)}${tag('item_group_id', i.groupId)}<title>${xml(i.title)}</title><description>${xml(i.description)}</description><link>${xml(i.link)}</link>${tag('image_link', i.image)}${i.extraImages.map((u) => tag('additional_image_link', u)).join('')}${tag('price', i.price)}${tag('sale_price', i.salePrice)}${tag('availability', i.availability)}${tag('condition', 'new')}${tag('brand', i.brand)}${tag('product_type', i.productType)}</item>`,
  )
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${xml(shop.title)}</title><link>${xml(shop.link)}</link>${entries.join('')}</channel></rss>\n`
}

/** The same items as a spreadsheet, with Meta's column names (Google reads them too). */
export const feedCsv = (items: FeedItem[]) =>
  toCsv([
    [...feedColumns],
    ...items.map((i) => [
      i.id,
      i.groupId ?? '',
      i.title,
      i.description,
      i.availability,
      'new',
      i.price,
      i.salePrice ?? '',
      i.link,
      i.image,
      i.extraImages.join(','),
      i.brand,
      i.productType,
    ]),
  ])

const feedColumns = [
  'id',
  'item_group_id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'sale_price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
  'product_type',
] as const
