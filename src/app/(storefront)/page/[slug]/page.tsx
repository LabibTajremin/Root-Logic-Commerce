import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { parseBody, parseInline } from '@/modules/pages'
import { breadcrumbLd, JsonLd } from '../../json-ld'
import { origin } from '../../origin'
import { storefront } from '../../storefront'

type Props = { params: Promise<{ slug: string }> }

const page = async (slug: string) => {
  const { pages, store } = await storefront()
  return (await pages.get(store.id, slug)) ?? notFound()
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => ({
  title: (await page((await params).slug)).title,
})

// Owner text is rendered as React text nodes only — no HTML from the database ever reaches the page.
const Inline = ({ text }: { text: string }) =>
  parseInline(text).map((r, i) => (r.bold ? <strong key={i}>{r.text}</strong> : r.text))

export default async function CmsPage({ params }: Props) {
  const p = await page((await params).slug)
  const { t } = await storefront()
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
      <JsonLd
        data={breadcrumbLd(await origin(), [
          { name: t('nav.home'), path: '/' },
          { name: p.title, path: `/page/${p.slug}` },
        ])}
      />
      <h1 className="font-heading text-3xl md:text-4xl">{p.title}</h1>
      {parseBody(p.body).map((b, i) =>
        b.kind === 'ul' ? (
          <ul key={i} className="list-disc pl-6">
            {b.items.map((it, j) => (
              <li key={j}>
                <Inline text={it} />
              </li>
            ))}
          </ul>
        ) : b.kind === 'p' ? (
          <p key={i} className="leading-relaxed">
            <Inline text={b.text} />
          </p>
        ) : b.kind === 'h2' ? (
          <h2 key={i} className="font-heading text-2xl">
            <Inline text={b.text} />
          </h2>
        ) : (
          <h3 key={i} className="font-heading text-xl">
            <Inline text={b.text} />
          </h3>
        ),
      )}
    </article>
  )
}
