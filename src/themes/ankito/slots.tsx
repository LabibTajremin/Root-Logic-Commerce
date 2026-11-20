import Link from 'next/link'
import type { Slots } from '../_contract'

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

export const Header: Slots['Header'] = ({ store, categories, actions }) => (
  <header className="rlc-header sticky top-0 z-20 bg-header text-header-text shadow-[0_6px_20px_-12px_rgb(34_56_28/0.35)]">
    <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
      <Link href="/" className="flex min-h-11 items-center gap-2 font-heading text-2xl">
        <span
          aria-hidden
          className="inline-flex size-10 items-center justify-center rounded-full bg-button text-lg text-button-text"
        >
          {initial(store.name)}
        </span>
        {store.name}
      </Link>
      <nav aria-label="Categories" className="hidden flex-1 justify-center gap-2 text-sm md:flex">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/c/${c.slug}`}
            className="rounded-full px-3 py-2.5 hover:bg-soft"
          >
            {c.name}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1 md:ml-0">{actions}</div>
    </div>
  </header>
)

export const Hero: Slots['Hero'] = ({ store, title, sub, cta }) => (
  <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
    <div className="flex flex-col gap-5">
      <p className="w-fit rounded-full bg-soft px-3 py-1 text-sm font-semibold">{sub}</p>
      <h1 className="font-heading text-4xl leading-tight md:text-6xl">{title}</h1>
      {cta}
    </div>
    <div
      aria-hidden
      className="flex aspect-[4/3] items-center justify-center rounded-card bg-soft font-heading text-8xl text-muted"
    >
      {initial(store.name)}
    </div>
  </section>
)

export const ProductCard: Slots['ProductCard'] = ({ product, action, labels }) => (
  <article className="rlc-card flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-[0_10px_30px_-18px_rgb(34_56_28/0.45)]">
    {/* Duplicate of the title link: hidden from AT and tab order to avoid a nameless link. */}
    <Link href={`/p/${product.slug}`} aria-hidden tabIndex={-1} className="relative block">
      <span className="rlc-media flex aspect-square items-center justify-center bg-soft font-heading text-5xl text-muted">
        {initial(product.name)}
      </span>
      {product.compareAt && (
        <span className="absolute left-3 top-3 rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold">
          {labels.sale}
        </span>
      )}
    </Link>
    <div className="flex flex-1 flex-col gap-2 p-4">
      <Link href={`/p/${product.slug}`} className="font-semibold leading-snug">
        {product.name}
      </Link>
      <p className="flex items-baseline gap-2">
        <span className="font-heading text-xl">{product.price}</span>
        {product.compareAt && <s className="text-sm text-muted">{product.compareAt}</s>}
      </p>
      <div className="mt-auto">
        {product.inStock ? action : <p className="text-sm text-muted">{labels.soldOut}</p>}
      </div>
    </div>
  </article>
)
