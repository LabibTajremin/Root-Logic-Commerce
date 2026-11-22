import Link from 'next/link'
import { BrandLogo } from '@/ui/brand-logo'
import { ProductBadges, StockLeft } from '@/ui/product-badges'
import { ProductImage } from '@/ui/product-image'
import type { Slots } from '../_contract'

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

// Airy, light and floral: centred thin-serif type, pill shapes and soft rose/plum tints.
export const Header: Slots['Header'] = ({ store, categories, actions }) => (
  <header className="rlc-header sticky top-0 z-20 bg-header text-header-text">
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 pt-3 pb-1">
      <div className="flex w-full items-center justify-between">
        <span aria-hidden className="flex-1" />
        <Link
          data-show-name={String(store.showName)}
          href="/"
          className="flex min-h-11 items-center font-heading text-3xl font-light tracking-wide"
        >
          <BrandLogo src={store.logo} fallback={null} />
          <span className="rlc-brand-name">{store.name}</span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-1">{actions}</div>
      </div>
      <nav aria-label="Categories" className="hidden gap-1 text-sm md:flex">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/c/${c.slug}`}
            className="rounded-full px-4 py-2.5 hover:bg-soft"
          >
            {c.name}
          </Link>
        ))}
      </nav>
    </div>
  </header>
)

export const Hero: Slots['Hero'] = ({ title, sub, cta }) => (
  <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-16 md:py-28">
    {/* Soft petals of colour behind the text: decorative only. */}
    <span
      aria-hidden
      className="absolute -left-16 top-6 size-64 rounded-full bg-accent-tint blur-3xl"
    />
    <span
      aria-hidden
      className="absolute -right-10 bottom-0 size-72 rounded-full bg-soft blur-3xl"
    />
    <div className="relative flex flex-col items-center gap-6 text-center">
      <h1 className="max-w-3xl font-heading text-5xl font-light leading-tight md:text-7xl">
        {title}
      </h1>
      <p className="max-w-xl text-lg text-muted">{sub}</p>
      {cta}
    </div>
  </section>
)

export const ProductCard: Slots['ProductCard'] = ({ product, action, labels }) => (
  <article className="rlc-card flex h-full flex-col items-center gap-3 rounded-card bg-surface p-3 text-center">
    {/* Duplicate of the title link: hidden from AT and tab order to avoid a nameless link. */}
    <Link
      href={`/p/${product.slug}`}
      aria-hidden
      tabIndex={-1}
      className="relative block w-full overflow-hidden rounded-card"
    >
      <span className="rlc-media relative flex aspect-[4/5] items-center justify-center bg-soft font-heading text-6xl font-light text-muted">
        {product.image ? (
          <ProductImage image={product.image} sizes="(min-width: 768px) 25vw, 50vw" />
        ) : (
          initial(product.name)
        )}
      </span>
      <ProductBadges badges={product.badges} className="absolute right-3 top-3" />
    </Link>
    <Link href={`/p/${product.slug}`} className="font-heading text-xl font-light">
      {product.name}
    </Link>
    <p className="flex items-baseline gap-2 text-sm tracking-wide">
      {product.price}
      {product.compareAt && <s className="text-muted">{product.compareAt}</s>}
    </p>
    <div className="mt-auto w-full">
      <StockLeft n={product.left} label={labels.left} />
      {product.inStock ? action : <p className="text-sm text-muted">{labels.soldOut}</p>}
    </div>
  </article>
)
