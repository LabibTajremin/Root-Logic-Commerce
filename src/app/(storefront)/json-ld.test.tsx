import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { breadcrumbLd, faqLd, JsonLd, organizationLd, serializeLd } from './json-ld'

describe('storefront JSON-LD', () => {
  it('breadcrumbs number their items from 1 with absolute URLs', () => {
    expect(
      breadcrumbLd('https://shop.test', [
        { name: 'Home', path: '/' },
        { name: 'Tea', path: '/c/tea' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://shop.test/' },
        { '@type': 'ListItem', position: 2, name: 'Tea', item: 'https://shop.test/c/tea' },
      ],
    })
  })

  it('FAQ answers become a FAQPage (A6)', () => {
    expect(faqLd([{ q: 'COD?', a: 'Yes' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'COD?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes' },
        },
      ],
    })
  })

  it('organization lists social profiles only when there are some', () => {
    expect(organizationLd('https://shop.test', 'Ankito', [])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Ankito',
      url: 'https://shop.test',
    })
    expect(
      organizationLd('https://shop.test', 'Ankito', [{ url: 'https://fb.com/a' }]),
    ).toMatchObject({
      sameAs: ['https://fb.com/a'],
    })
  })

  it('serialized JSON cannot close the script tag', () => {
    expect(serializeLd({ name: '</script>' })).toBe('{"name":"\\u003c/script>"}')
    expect(renderToStaticMarkup(<JsonLd data={{ a: 1 }} />)).toBe(
      '<script type="application/ld+json">{"a":1}</script>',
    )
  })
})
