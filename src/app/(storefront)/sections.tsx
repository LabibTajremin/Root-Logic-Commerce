import Link from 'next/link'
import type { ReactNode } from 'react'
import type { ResolvedSection, SectionId } from '@/sections/registry'
import { sliderPosters } from './hero-posters'
import { HeroSlider } from './hero-slider'
import { Poster } from './poster'
import { ProductGrid } from './product-grid'
import { PromoBanners } from './promo-banners'
import type { storefront } from './storefront'

type Ctx = Awaited<ReturnType<typeof storefront>>

const renderers: Record<SectionId, (p: { ctx: Ctx }) => ReactNode | Promise<ReactNode>> = {
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
}

/** Renders a page's resolved sections in order. */
export const Sections = ({ sections, ctx }: { sections: ResolvedSection[]; ctx: Ctx }) => (
  <div className="flex flex-col gap-6">
    {sections.map((s, i) => {
      const Section = renderers[s.id]
      return <Section key={`${s.id}-${i}`} ctx={ctx} />
    })}
  </div>
)
