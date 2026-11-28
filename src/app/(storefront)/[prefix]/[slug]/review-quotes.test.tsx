import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReviewQuotes } from './review-quotes'

const stars = '{{n}} of 5'

describe('landing review quotes (H5)', () => {
  it('lists up to six approved reviews, or nothing at all', () => {
    const reviews = Array.from({ length: 7 }, (_, i) => ({
      id: `r${i}`,
      rating: 5,
      body: `Great ${i}`,
      name: `Rahim ${i}`,
    }))
    const html = renderToStaticMarkup(<ReviewQuotes title="Said" reviews={reviews} stars={stars} />)
    expect(html).toContain('<h2')
    expect(html).toContain('aria-label="5 of 5"')
    expect(html.match(/<li/g)).toHaveLength(6)
    expect(
      renderToStaticMarkup(<ReviewQuotes title="" reviews={reviews} stars={stars} />),
    ).not.toContain('<h2')
    expect(renderToStaticMarkup(<ReviewQuotes title="Said" reviews={[]} stars={stars} />)).toBe('')
  })
})
