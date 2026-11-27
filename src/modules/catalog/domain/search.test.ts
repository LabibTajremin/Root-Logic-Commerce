import { describe, expect, it } from 'vitest'
import { didYouMean, searchProducts } from './search'

const p = (name: string, sku: string | null = null, keywords: string[] = []) => ({
  name,
  sku,
  keywords,
})
const shirt = p('Cotton Panjabi Shirt', 'PJ-01', ['Men', 'Aarong'])
const saree = p('Jamdani Saree', null, ['Women'])
const tea = p('চা পাতা প্রিমিয়াম', 'TEA-9', ['খাবার'])
const all = [saree, shirt, tea]
const names = (q: string) => searchProducts(all, q).map((x) => x.name)

describe('shop search', () => {
  it('finds words in any order, in the name, SKU, category or brand', () => {
    expect(names('')).toEqual([saree.name, shirt.name, tea.name])
    expect(names('shirt panjabi')).toEqual([shirt.name])
    expect(names('pj-01')).toEqual([shirt.name])
    expect(names('aarong')).toEqual([shirt.name])
    expect(names('women')).toEqual([saree.name])
    expect(names('চা')).toEqual([tea.name])
    expect(names('ton')).toEqual([shirt.name]) // inside a word
    expect(names('shirt saree')).toEqual([])
  })

  it('forgives a typo in longer words, never in short ones', () => {
    expect(names('panjabbi')).toEqual([shirt.name])
    expect(names('shrt')).toEqual([shirt.name])
    expect(names('jamdany sare')).toEqual([saree.name])
    expect(names('men')).toEqual([shirt.name, saree.name]) // exact first, then inside "women"
    expect(names('mxn')).toEqual([])
    // A code with one character off is a different product.
    expect(names('pj-02')).toEqual([])
    expect(searchProducts([p('Kurta k4etk1'), p('Kurta k4etk9')], 'k4etk1').length).toBe(1)
  })

  it('ranks the best fit first', () => {
    const items = [p('Sarees pack'), p('Saree')]
    expect(searchProducts(items, 'saree').map((x) => x.name)).toEqual(['Saree', 'Sarees pack'])
  })

  it('suggests the nearest shop words when nothing matched', () => {
    expect(didYouMean(all, 'jamdni sarre')).toBe('jamdani saree')
    expect(didYouMean(all, 'cotton xyzzyq')).toBeNull()
    expect(didYouMean(all, 'cot')).toBeNull()
    expect(didYouMean(all, 'ab')).toBeNull()
    expect(didYouMean(all, '   ')).toBeNull()
  })
})
