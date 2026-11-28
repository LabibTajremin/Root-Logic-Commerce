import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { splitRow, type LandingBlock } from '@/modules/landing'
import { parseEmbed } from '@/modules/promotions'
import { Icon } from '@/ui/icon'
import { ProductImage } from '@/ui/product-image'
import { checkoutProps } from '../../checkout/checkout-props'
import { EmbedFacade } from '../../embed-facade'
import { TrackOnView } from '../../ga'
import { storefront } from '../../storefront'
import { Countdown } from '../../countdown'
import { ExitPopup } from './exit-popup'
import { LandingOrder } from './landing-order'
import { ReviewQuotes } from './review-quotes'

type Props = { params: Promise<{ prefix: string; slug: string }> }

/** H5: a shown page of this shop, at its own prefix, for an active product. */
const load = async ({ params }: Props) => {
  const { prefix, slug } = await params
  const s = await storefront()
  if (!s.on('landingPages') || prefix !== s.business.landing.prefix) return null
  const page = await s.landing.forShoppers(s.store.id, slug)
  const product = page && (await s.catalog.getProduct(s.store.id, page.productId))
  return product?.status === 'active' ? { s, page: page!, product } : null
}

export const generateMetadata = async (props: Props): Promise<Metadata> => {
  const r = await load(props)
  return r ? { title: r.page.title } : {}
}

const Section = ({ children, id }: { children: ReactNode; id?: string }) => (
  <section id={id} className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8">
    {children}
  </section>
)
const H2 = ({ children }: { children: ReactNode }) =>
  children ? <h2 className="font-heading text-2xl">{children}</h2> : null
const Ticks = ({ items }: { items: string[] }) => (
  <ul className="grid gap-3 sm:grid-cols-2">
    {items.map((x) => (
      <li
        key={x}
        className="flex items-center gap-3 rounded-card border border-line bg-surface p-4"
      >
        <span className="text-success">
          <Icon name="check" size={20} />
        </span>
        {x}
      </li>
    ))}
  </ul>
)

export default async function LandingPage(props: Props) {
  const r = await load(props)
  if (!r) notFound()
  const { s, page, product: p } = r
  const { t, money, store, business } = s
  await s.landing.visit(store.id, page.id)
  const [images, { reviews }, checkout] = await Promise.all([
    s.imagesOf([p]).then((m) => m.get(p.id)!),
    s.reviews.forProduct(store.id, p.id),
    checkoutProps(),
  ])
  const shown = page.blocks.filter((b) => b.on)
  const packs = shown.find((b) => b.kind === 'packs')?.packs ?? []
  // A product with options needs its own page to pick them; the order block sends shoppers there.
  const orderHere = p.options.length === 0
  const cta = (label: string) => (
    <a
      href={orderHere ? '#order' : `/p/${p.slug}`}
      className="inline-flex min-h-12 items-center justify-center rounded-control bg-button px-6 text-lg font-semibold text-button-text"
    >
      {label}
    </a>
  )
  const price = (
    <p className="flex items-baseline gap-3">
      <span className="text-3xl font-semibold">{money(p.price)}</span>
      {p.compareAtPrice !== null && <s className="text-muted">{money(p.compareAtPrice)}</s>}
    </p>
  )
  const block = (b: LandingBlock, i: number): ReactNode => {
    switch (b.kind) {
      case 'hero':
        return (
          <Section key={i}>
            <div className="grid items-center gap-6 md:grid-cols-2">
              {images[0] && (
                <div className="relative aspect-square overflow-hidden rounded-card bg-soft">
                  <ProductImage image={images[0]} sizes="(min-width: 768px) 50vw, 100vw" priority />
                </div>
              )}
              <div className="flex flex-col gap-4">
                <h1 className="font-heading text-4xl">{b.title || p.name}</h1>
                {b.text && <p className="text-lg text-muted">{b.text}</p>}
                {price}
                {cta(t('landing.order'))}
              </div>
            </div>
          </Section>
        )
      case 'video': {
        const e = b.url ? parseEmbed(b.url) : null
        return (
          e && (
            <Section key={i}>
              <H2>{b.title}</H2>
              <EmbedFacade embed={e} label={t('promotions.play')} title={b.title || p.name} />
            </Section>
          )
        )
      }
      case 'price':
        return (
          <Section key={i}>
            <div className="flex flex-col items-center gap-3 rounded-card bg-soft p-6 text-center">
              {price}
              {b.endsAt && (
                <Countdown
                  endsAt={b.endsAt.toISOString()}
                  labels={{ left: t('landing.endsIn'), ended: t('landing.ended') }}
                />
              )}
              {cta(b.title || t('landing.order'))}
            </div>
          </Section>
        )
      case 'packs':
        return (
          <Section key={i}>
            <H2>{b.title}</H2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {b.packs.map((x) => (
                <li
                  key={x.qty}
                  className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4"
                >
                  <span className="font-semibold">{t('landing.pcs', { n: x.qty })}</span>
                  <span className="text-2xl font-semibold">{money(x.price)}</span>
                  {p.price * x.qty > x.price && (
                    <span className="text-sm text-success">
                      {t('landing.save', { amount: money(p.price * x.qty - x.price) })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )
      case 'problem':
        return (
          <Section key={i}>
            <H2>{b.title}</H2>
            <p className="text-lg">{b.text}</p>
          </Section>
        )
      case 'whyUs':
      case 'benefits':
        return (
          <Section key={i}>
            <H2>{b.title || t(`landing.${b.kind}`)}</H2>
            <Ticks items={b.items} />
          </Section>
        )
      case 'comparison':
        return (
          <Section key={i}>
            <H2>{b.title || t('landing.comparison')}</H2>
            <table className="w-full overflow-hidden rounded-card border border-line text-left">
              <thead className="bg-soft">
                <tr>
                  <th className="p-3">{store.name}</th>
                  <th className="p-3">{t('landing.others')}</th>
                </tr>
              </thead>
              <tbody>
                {b.items.map((row) => {
                  const [us, them] = splitRow(row)
                  return (
                    <tr key={row} className="border-t border-line">
                      <td className="p-3 font-semibold">{us}</td>
                      <td className="p-3 text-muted">{them}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Section>
        )
      case 'gallery':
        return (
          images.length > 1 && (
            <Section key={i}>
              <H2>{b.title}</H2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {images.map((img) => (
                  <div
                    key={img.src}
                    className="relative aspect-square overflow-hidden rounded-card"
                  >
                    <ProductImage image={img} sizes="(min-width: 768px) 33vw, 50vw" />
                  </div>
                ))}
              </div>
            </Section>
          )
        )
      case 'reviews':
        return <ReviewQuotes key={i} title={b.title} reviews={reviews} stars={t('landing.stars')} />
      case 'delivery':
        return (
          <Section key={i}>
            <H2>{b.title || t('landing.delivery')}</H2>
            {b.text && <p>{b.text}</p>}
            <ul className="flex flex-col gap-1">
              {business.deliveryZones.map((z) => (
                <li key={z.id} className="flex justify-between border-b border-line py-2">
                  <span>{z.label}</span>
                  <span className="font-semibold">{money(z.charge)}</span>
                </li>
              ))}
            </ul>
          </Section>
        )
      case 'faq':
        return (
          <Section key={i}>
            <H2>{b.title || t('landing.faq')}</H2>
            {b.items.map((row) => {
              const [q, a] = splitRow(row)
              return (
                <details key={row} className="rounded-card border border-line bg-surface p-4">
                  <summary className="cursor-pointer font-semibold">{q}</summary>
                  <p className="mt-2 text-muted">{a}</p>
                </details>
              )
            })}
          </Section>
        )
      case 'guarantee':
        return (
          <Section key={i}>
            <div className="flex items-center gap-4 rounded-card border-2 border-success p-5">
              <span className="text-success">
                <Icon name="check" size={32} />
              </span>
              <div>
                <p className="font-semibold">{b.title || t('landing.guarantee')}</p>
                <p>{b.text}</p>
              </div>
            </div>
          </Section>
        )
      case 'checkout':
        return (
          <Section key={i} id="order">
            <H2>{b.title || t('landing.order')}</H2>
            {orderHere ? (
              <LandingOrder
                id={page.id}
                item={{
                  id: p.id,
                  productId: p.id,
                  variantId: null,
                  slug: p.slug,
                  name: p.name,
                  price: p.price,
                }}
                packs={packs}
                labels={{
                  packs: t('landing.choosePack'),
                  pcs: t('landing.pcs'),
                  save: t('landing.save'),
                }}
                checkout={checkout}
              />
            ) : (
              cta(t('landing.chooseOptions'))
            )}
          </Section>
        )
      case 'stickyBar':
        return (
          <div
            key={i}
            data-testid="landing-sticky"
            className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3"
          >
            <span className="font-semibold">{money(p.price)}</span>
            {cta(b.title || t('landing.order'))}
          </div>
        )
      case 'exitPopup':
        return (
          <ExitPopup
            key={i}
            id={page.id}
            text={b.text}
            labels={{ order: t('landing.order'), close: t('common.close') }}
          />
        )
    }
  }
  return (
    <div data-landing={page.design} className="bg-bg text-text">
      {/* The page stands alone unless the owner asked for the shop's header and footer. */}
      {!page.siteChrome && <style>{'[data-chrome]{display:none}'}</style>}
      <TrackOnView
        name="view_item"
        params={{
          currency: business.currency,
          value: p.price / 100,
          items: [{ item_id: p.id, item_name: p.name }],
        }}
      />
      {shown.map(block)}
    </div>
  )
}
