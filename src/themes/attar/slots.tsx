import Link from 'next/link'
import type { Slots } from '../_contract'

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

export const Header: Slots['Header'] = ({ store, categories, actions }) => (
  <header className="rlc-header sticky top-0 z-20 border-b border-line bg-header text-header-text">
    <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-2">
      <nav
        aria-label="Categories"
        className="hidden gap-5 text-xs uppercase tracking-[0.2em] md:flex"
      >
        {categories.slice(0, 4).map((c) => (
          <Link key={c.slug} href={`/c/${c.slug}`} className="py-3">
            {c.name}
          </Link>
        ))}
      </nav>
      <Link
        href="/"
        className="col-start-2 flex min-h-11 items-center font-heading text-2xl uppercase tracking-[0.25em]"
      >
        {store.name}
      </Link>
      <div className="col-start-3 flex items-center justify-end gap-1">{actions}</div>
    </div>
  </header>
)

export const Hero: Slots['Hero'] = ({ title, sub, cta }) => (
  <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-16 text-center md:py-28">
    <span aria-hidden className="h-px w-24 bg-accent" />
    <h1 className="font-heading text-5xl uppercase leading-tight tracking-[0.12em] md:text-7xl">
      {title}
    </h1>
    <p className="max-w-xl text-muted">{sub}</p>
    <span aria-hidden className="h-px w-24 bg-accent" />
    {cta}
  </section>
)

export const ProductCard: Slots['ProductCard'] = ({ product, action, labels }) => (
  <article className="rlc-card flex h-full flex-col border border-line bg-surface text-center">
    {/* Duplicate of the title link: hidden from AT and tab order to avoid a nameless link. */}
    <Link
      href={`/p/${product.slug}`}
      aria-hidden
      tabIndex={-1}
      className="relative block overflow-hidden"
    >
      <span className="rlc-media flex aspect-[3/4] items-center justify-center bg-soft font-heading text-6xl text-muted">
        {initial(product.name)}
      </span>
      {product.compareAt && (
        <span className="absolute left-0 top-3 bg-button px-3 py-0.5 text-xs font-semibold uppercase tracking-widest text-button-text">
          {labels.sale}
        </span>
      )}
    </Link>
    <div className="flex flex-1 flex-col gap-2 p-4">
      <Link href={`/p/${product.slug}`} className="font-heading text-xl">
        {product.name}
      </Link>
      <p className="text-sm tracking-widest">
        {product.price}
        {product.compareAt && <s className="ml-2 text-muted">{product.compareAt}</s>}
      </p>
      <div className="mt-auto">
        {product.inStock ? (
          action
        ) : (
          <p className="text-sm uppercase tracking-widest text-muted">{labels.soldOut}</p>
        )}
      </div>
    </div>
  </article>
)
