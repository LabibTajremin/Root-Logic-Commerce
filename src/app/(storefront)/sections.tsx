import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { ResolvedSection, SectionId } from '@/sections/registry'
import { ComboList } from './combos/combo-list'
import { Countdown } from './countdown'
import { sliderPosters } from './hero-posters'
import { HeroSlider } from './hero-slider'
import { Poster } from './poster'
import { ProductGrid } from './product-grid'
import { PromoBanners } from './promo-banners'
import { ScreenshotStrip } from './screenshot-strip'
import { TrustStrip } from './trust-strip'
import type { storefront } from './storefront'

type Ctx = Awaited<ReturnType<typeof storefront>>

type Render = (p: { ctx: Ctx; settings: Record<string, unknown> }) => ReactNode | Promise<ReactNode>
const wrap = 'mx-auto flex w-full max-w-6xl flex-col gap-4 px-4'

const renderers: Record<SectionId, Render> = {
  combos: ({ ctx }) =>
    ctx.on('combos') &&
    ctx.business.combos.some((c) => c.on) && (
      <section aria-labelledby="combos-title" className={wrap}>
        <h2 id="combos-title" className="font-heading text-2xl">
          {ctx.t('combos.title')}
        </h2>
        <ComboList ctx={ctx} limit={3} />
        <Link href="/combos" className="font-semibold underline">
          {ctx.t('combos.all')}
        </Link>
      </section>
    ),
  'flash-sale': async ({ ctx }) => {
    const { sale, catalog, store, t } = ctx
    if (!sale) return null
    const listed = new Set(sale.items.map((i) => i.productId))
    const products = (await catalog.listProducts(store.id, { status: 'active' }))
      .filter((p) => listed.has(p.id))
      .slice(0, 4)
    return (
      <section aria-labelledby="flash-title" className={wrap}>
        <h2 id="flash-title" className="font-heading text-2xl">
          {sale.name}
        </h2>
        <Countdown
          endsAt={sale.endsAt.toISOString()}
          labels={{ left: t('flash.endsIn'), ended: t('flash.ended') }}
        />
        <ProductGrid products={products} />
        <Link href="/flash-sale" className="font-semibold underline">
          {t('flash.all')}
        </Link>
      </section>
    )
  },
  'promo-banners': () => <PromoBanners />,
  hero: async ({ ctx }) => {
    const { theme, store, design, t } = ctx
    const posters = await sliderPosters(ctx)
    if (posters.length > 0)
      return (
        <>
          {/* The welcome hero carries the page's h1; the slider replacing it keeps one. */}
          <h1 className="sr-only">{store.name}</h1>
          <HeroSlider
            slides={posters.map((p, i) => (
              <Poster key={p.id} d={p.data} priority={i === 0} />
            ))}
            interval={design.heroSlider.interval}
            effect={design.heroSlider.effect}
            labels={{
              region: t('shop.featured'),
              prev: t('shop.prevSlide'),
              next: t('shop.nextSlide'),
              slide: t('shop.slideOf'),
            }}
          />
        </>
      )
    const { Hero } = theme.slots
    return (
      <Hero
        store={store}
        title={store.name}
        sub={`${t('shop.delivery')} · ${t('shop.cod')}`}
        cta={
          <Link
            href="#products"
            className="inline-flex min-h-11 items-center rounded-control bg-button px-6 font-semibold text-button-text"
          >
            {t('shop.shop')}
          </Link>
        }
      />
    )
  },
  'category-nav': ({ ctx: { theme, categories, t } }) => {
    const { CategoryNav } = theme.slots
    return (
      <div className="mx-auto w-full max-w-6xl px-4">
        <CategoryNav categories={categories} allLabel={t('shop.all')} />
      </div>
    )
  },
  'product-grid': async ({ ctx: { catalog, store, t } }) => (
    <section id="products" className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
      <h2 className="font-heading text-2xl">{t('shop.products')}</h2>
      <ProductGrid products={await catalog.listProducts(store.id, { status: 'active' })} />
    </section>
  ),
  // B5: a row per top category that has products, each with "Shop X →".
  'category-rows': async ({ ctx: { catalog, store, allCategories, t }, settings }) => {
    const rows = await Promise.all(
      allCategories
        .filter((c) => !c.parentId)
        .map(async (c) => ({
          c,
          products: (
            await catalog.listProducts(store.id, { status: 'active', categoryId: c.id })
          ).slice(0, settings.count as number),
        })),
    )
    return rows
      .filter((r) => r.products.length > 0)
      .map(({ c, products }) => (
        <section key={c.id} aria-labelledby={`row-${c.id}`} className={wrap}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={`row-${c.id}`} className="font-heading text-2xl">
              {c.name}
            </h2>
            <Link href={`/c/${c.slug}`} className="text-sm font-semibold underline">
              {t('home.shopCategory', { name: c.name })}
            </Link>
          </div>
          <ProductGrid products={products} />
        </section>
      ))
  },
  brands: async ({ ctx: { catalog, store, t } }) => {
    const brands = (await catalog.listBrands(store.id)).filter((b) => !b.archived)
    return (
      // Hidden by CSS while there is nothing to show (no brands yet).
      <section aria-labelledby="brands-title" className={`${wrap} has-[ul:empty]:hidden`}>
        <h2 id="brands-title" className="font-heading text-2xl">
          {t('home.brands')}
        </h2>
        <ul className="flex flex-wrap gap-3">
          {brands.map((b) => (
            <li key={b.id}>
              <Link
                href={`/b/${b.slug}`}
                className="flex min-h-14 items-center gap-2 rounded-card border border-line bg-surface px-4 font-semibold"
              >
                {b.logoId && (
                  <span className="relative size-10 overflow-hidden rounded-control">
                    <Image
                      src={`/api/media/${b.logoId}`}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-contain"
                    />
                  </span>
                )}
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    )
  },
  // B12: owner-named price caps → the filtered product list.
  'budget-bands': ({ ctx: { business, t } }) => (
    <section aria-labelledby="budget-title" className={`${wrap} has-[ul:empty]:hidden`}>
      <h2 id="budget-title" className="font-heading text-2xl">
        {t('home.budget')}
      </h2>
      <ul className="flex flex-wrap gap-3">
        {business.budgetBands.map((b) => (
          <li key={b.max}>
            <Link
              href={`/search?max=${b.max / 100}`}
              className="flex min-h-12 items-center rounded-full bg-button px-5 font-semibold text-button-text"
            >
              {b.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ),
  'trust-strip': ({ ctx: { business, t } }) => (
    <div className={wrap}>
      <TrustStrip trust={business.trust} t={t} place="home" />
    </div>
  ),
  'screenshot-reviews': async ({ ctx: { reviews, store, t } }) => {
    const shots = await reviews.screenshots(store.id)
    return (
      <div className={wrap}>
        <ScreenshotStrip shots={shots} labels={{ title: t('shots.shop'), alt: t('shots.alt') }} />
      </div>
    )
  },
}

/** Renders a page's resolved sections in order. */
export const Sections = ({ sections, ctx }: { sections: ResolvedSection[]; ctx: Ctx }) => (
  <div className="flex flex-col gap-6">
    {sections.map((s, i) => {
      const Section = renderers[s.id]
      return <Section key={`${s.id}-${i}`} ctx={ctx} settings={s.settings} />
    })}
  </div>
)
