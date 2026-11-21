const context = 'https://schema.org'

export const breadcrumbLd = (base: string, items: { name: string; path: string }[]) => ({
  '@context': context,
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${base}${it.path}`,
  })),
})

export const organizationLd = (base: string, name: string, socials: { url: string }[]) => ({
  '@context': context,
  '@type': 'Organization',
  name,
  url: base,
  ...(socials.length > 0 && { sameAs: socials.map((s) => s.url) }),
})

// JSON.stringify output with `<` escaped cannot close the script tag.
export const serializeLd = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c')

export const JsonLd = ({ data }: { data: object }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeLd(data) }} />
)
