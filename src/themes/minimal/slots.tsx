import Link from 'next/link'
import { BrandLogo } from '@/ui/brand-logo'
import { ProductBadges, StockLeft } from '@/ui/product-badges'
import { ProductImage } from '@/ui/product-image'
import type { Slots } from '../_contract'

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

export const Header: Slots['Header'] = ({ store, categories, actions }) => (
  <header className="rlc-header sticky top-0 z-20 border-b border-line bg-header text-header-text">
    <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
      <Link
        data-show-name={String(store.showName)}
        href="/"
        className="flex min-h-11 items-center gap-2 font-heading text-xl"
      >
        <BrandLogo
          src={store.logo}
          fallback={
            <span
              aria-hidden
              className="inline-flex size-9 items-center justify-center rounded-control bg-button text-button-text"
            >
              {initial(store.name)}
            </span>
          }
        />
        <span className="rlc-brand-name">{store.name}</span>
      </Link>
      <nav aria-label="Categories" className="hidden flex-1 justify-center gap-6 text-sm md:flex">
        {categories.map((c) => (
          <Link key={c.slug} href={`/c/${c.slug}`} className="py-3">
            {c.name}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1 md:ml-0">{actions}</div>
    </div>
  </header>
)

export const Footer: Slots['Footer'] = ({
  store,
  categories,
  text,
  credit,
  labels,
  pages,
  look,
}) => (
  // The preset (classic / centered / minimal) is a data-* hook styled in globals.css.
  <footer data-footer={look.style} className="mt-16 bg-soft">
    <div className="rlc-footer-grid mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
      <div className="flex flex-col gap-2">
        <BrandLogo src={store.footerLogo} fallback={null} />
        <p className="font-heading text-xl">{store.name}</p>
        {text && <p className="text-sm text-muted">{text}</p>}
      </div>
      {look.show.categories && (
        <nav aria-label={labels.shop} className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">{labels.shop}</p>
          {categories.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="text-muted">
              {c.name}
            </Link>
          ))}
        </nav>
      )}
      {look.show.help && (
        <nav aria-label={labels.help} className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">{labels.help}</p>
          <Link href="/track" className="text-muted">
            {labels.track}
          </Link>
          <Link href="/search" className="text-muted">
            {labels.search}
          </Link>
          {pages.map((p) => (
            <Link key={p.slug} href={`/page/${p.slug}`} className="text-muted">
              {p.title}
            </Link>
          ))}
        </nav>
      )}
    </div>
    {look.show.payments && (
      <p
        data-testid="footer-payments"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pb-4 text-xs text-muted"
      >
        <span>{labels.payWith}</span>
        {['cod', 'bKash', 'Nagad'].map((m) => (
          <span
            key={m}
            className="rounded-full border border-line bg-surface px-2.5 py-1 font-semibold"
          >
            {m === 'cod' ? labels.codShort : m}
          </span>
        ))}
      </p>
    )}
    <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 border-t border-line px-4 py-5 text-sm text-muted">
      <span>
        © {new Date().getFullYear()} {store.name}
      </span>
      {credit && <span>Powered by © Root Logic Lab</span>}
    </div>
  </footer>
)

export const Hero: Slots['Hero'] = ({ title, sub, cta }) => (
  <section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-12 md:py-20">
    <h1 className="max-w-3xl font-heading text-4xl leading-tight md:text-6xl">{title}</h1>
    {sub && <p className="max-w-2xl text-lg text-muted">{sub}</p>}
    <div>{cta}</div>
  </section>
)

export const ProductCard: Slots['ProductCard'] = ({ product, action, labels }) => (
  <article className="rlc-card flex flex-col overflow-hidden rounded-card border border-line bg-surface">
    {/* Duplicate of the title link: hidden from AT and tab order to avoid a nameless link. */}
    <Link href={`/p/${product.slug}`} aria-hidden tabIndex={-1} className="relative block">
      {/* Fixed 1:1 box: any upload size fits without shifting the layout. */}
      <span
        aria-hidden
        className="rlc-media relative flex aspect-square items-center justify-center bg-soft font-heading text-5xl text-muted"
      >
        {product.image ? (
          <ProductImage image={product.image} sizes="(min-width: 768px) 25vw, 50vw" />
        ) : (
          initial(product.name)
        )}
      </span>
      <ProductBadges badges={product.badges} className="absolute left-3 top-3" />
    </Link>
    <div className="flex flex-1 flex-col gap-2 p-4">
      <Link href={`/p/${product.slug}`} className="font-semibold leading-snug">
        {product.name}
      </Link>
      <p className="flex items-baseline gap-2">
        <span className="font-semibold">{product.price}</span>
        {product.compareAt && <s className="text-sm text-muted">{product.compareAt}</s>}
      </p>
      <div className="mt-auto">
        <StockLeft n={product.left} label={labels.left} />
        {product.inStock ? action : <p className="text-sm text-muted">{labels.soldOut}</p>}
      </div>
    </div>
  </article>
)

export const ProductGallery: Slots['ProductGallery'] = ({ name, images }) =>
  images.length === 0 ? (
    <div
      aria-hidden
      className="rlc-media flex aspect-square items-center justify-center rounded-card bg-soft font-heading text-8xl text-muted"
    >
      {initial(name)}
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-card bg-soft">
        <ProductImage image={images[0]!} sizes="(min-width: 768px) 50vw, 100vw" priority />
      </div>
      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-2">
          {images.slice(1).map((i) => (
            <li
              key={i.src}
              className="relative aspect-square overflow-hidden rounded-control bg-soft"
            >
              <ProductImage image={i} sizes="160px" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )

export const CategoryNav: Slots['CategoryNav'] = ({ categories, active, allLabel }) => (
  <nav aria-label={allLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4">
    {[{ name: allLabel, slug: '' }, ...categories].map((c) => (
      <Link
        key={c.slug}
        href={c.slug ? `/c/${c.slug}` : '/search'}
        aria-current={c.slug === (active ?? '') ? 'page' : undefined}
        className="min-h-11 shrink-0 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold aria-[current=page]:bg-button aria-[current=page]:text-button-text"
      >
        {c.name}
      </Link>
    ))}
  </nav>
)

export const EmptyState: Slots['EmptyState'] = ({ title, body, action, level }) => {
  const H = level === 1 ? 'h1' : 'h2'
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line p-10 text-center">
      <H className="font-heading text-2xl">{title}</H>
      <p className="max-w-md text-muted">{body}</p>
      {action}
    </div>
  )
}
