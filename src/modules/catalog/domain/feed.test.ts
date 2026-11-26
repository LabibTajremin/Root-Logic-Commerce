import { describe, expect, it } from 'vitest'
import { feedCsv, feedItems, feedXml, type FeedProduct, type FeedVariant } from './feed'

const tee: FeedProduct = {
  id: 'p1',
  slug: 'tee',
  name: 'Tee & Co',
  description: '  ',
  price: 45000,
  compareAtPrice: 60000,
  stock: 0,
  sku: null,
  options: [],
  brandId: null,
  categoryId: 'c1',
  images: ['https://s.test/a.jpg', 'https://s.test/b.jpg'],
}

describe('product feed (H10)', () => {
  it('lists products and variants, skips ones without a photo', () => {
    const items = feedItems(
      [
        tee,
        { ...tee, id: 'p2', images: [] },
        {
          ...tee,
          id: 'p3',
          slug: 'polo',
          name: 'Polo',
          description: 'Soft',
          compareAtPrice: null,
          sku: 'POLO',
          brandId: 'b1',
          categoryId: null,
          options: [{ name: 'Size', values: ['S', 'M'] }],
          images: ['https://s.test/c.jpg'],
        },
        {
          ...tee,
          id: 'p4',
          slug: 'cap',
          name: 'Cap',
          options: [{ name: 'Colour', values: ['Red'] }],
        },
      ],
      {
        variants: [
          {
            productId: 'p3',
            id: 'v1',
            options: { Size: 'S' },
            price: 50000,
            compareAtPrice: null,
            stock: 2,
            sku: 'POLO-S',
          },
          {
            productId: 'p3',
            id: 'v2',
            options: { Size: 'M' },
            price: 50000,
            compareAtPrice: 70000,
            stock: 0,
            sku: null,
          },
          {
            productId: 'p4',
            id: 'v3',
            options: { Colour: 'Red' },
            price: 9000,
            compareAtPrice: null,
            stock: 1,
            sku: null,
          },
        ] satisfies FeedVariant[],
        brands: [{ id: 'b1', name: 'Acme' }],
        categories: [{ id: 'c1', name: 'Tops' }],
        shopName: 'Shop',
        base: 'https://shop.test',
        currency: 'BDT',
      },
    )
    expect(items).toMatchObject([
      {
        id: 'p1',
        groupId: null,
        title: 'Tee & Co',
        description: 'Tee & Co',
        link: 'https://shop.test/p/tee',
        extraImages: ['https://s.test/b.jpg'],
        price: '600.00 BDT',
        salePrice: '450.00 BDT',
        availability: 'out of stock',
        brand: 'Shop',
        productType: 'Tops',
      },
      {
        id: 'POLO-S',
        groupId: 'POLO',
        title: 'Polo (S)',
        brand: 'Acme',
        productType: '',
        price: '500.00 BDT',
        salePrice: null,
        availability: 'in stock',
      },
      { id: 'v2', groupId: 'POLO', title: 'Polo (M)', salePrice: '500.00 BDT' },
      { id: 'v3', groupId: 'p4', title: 'Cap (Red)' },
    ])
    const xml = feedXml(items, { title: 'Shop <1>', link: 'https://shop.test' })
    expect(xml).toContain('<title>Shop &lt;1&gt;</title>')
    expect(xml).toContain('<title>Tee &amp; Co</title>')
    expect(xml).toContain('<g:additional_image_link>https://s.test/b.jpg</g:additional_image_link>')
    expect(xml).toContain('<g:item_group_id>POLO</g:item_group_id>')
    expect(xml).not.toContain('<g:sale_price></g:sale_price>')
    const csv = feedCsv(items).split('\r\n')
    expect(csv[0]).toBe(
      'id,item_group_id,title,description,availability,condition,price,sale_price,link,image_link,additional_image_link,brand,product_type',
    )
    expect(csv[1]).toContain('p1,,Tee & Co,Tee & Co,out of stock,new,600.00 BDT,450.00 BDT')
  })
})
