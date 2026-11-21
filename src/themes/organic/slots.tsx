import Link from 'next/link'
import { ProductImage } from '@/ui/product-image'
import type { Slots } from '../_contract'

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

// Leaf motif: decorative only.
const Leaf = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className="size-6 fill-none stroke-current"
    strokeWidth={1.6}
  >
    <path d="M5 19C5 10 11 5 20 4c0 9-5 15-15 15zM5 19l8-8" />
  </svg>
)

export const Hero: Slots['Hero'] = ({ title, sub, cta }) => (
  <section className="mx-auto max-w-6xl px-4 py-8">
    <div className="flex flex-col items-center gap-5 rounded-card bg-soft px-6 py-14 text-center md:py-24">
      <span className="text-button">
        <Leaf />
      </span>
      <h1 className="max-w-3xl font-heading text-4xl leading-tight md:text-6xl">{title}</h1>
      <p className="max-w-xl text-lg text-muted">{sub}</p>
      {cta}
    </div>
  </section>
)

export const ProductCard: Slots['ProductCard'] = ({ product, action, labels }) => (
  <article className="rlc-card flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-3">
    {/* Duplicate of the title link: hidden from AT and tab order to avoid a nameless link. */}
    <Link
      href={`/p/${product.slug}`}
      aria-hidden
      tabIndex={-1}
      className="relative block overflow-hidden rounded-card"
    >
      <span className="rlc-media relative flex aspect-[4/5] items-center justify-center bg-soft font-heading text-5xl text-muted">
        {product.image ? (
          <ProductImage image={product.image} sizes="(min-width: 768px) 25vw, 50vw" />
        ) : (
          initial(product.name)
        )}
      </span>
      {product.compareAt && (
        <span className="absolute right-2 top-2 rounded-full bg-button px-2.5 py-0.5 text-xs font-semibold text-button-text">
          {labels.sale}
        </span>
      )}
    </Link>
    <Link href={`/p/${product.slug}`} className="px-1 font-heading text-lg leading-snug">
      {product.name}
    </Link>
    <p className="flex items-baseline gap-2 px-1">
      <span className="rounded-full bg-soft px-3 py-0.5 font-semibold">{product.price}</span>
      {product.compareAt && <s className="text-sm text-muted">{product.compareAt}</s>}
    </p>
    <div className="mt-auto">
      {product.inStock ? action : <p className="px-1 text-sm text-muted">{labels.soldOut}</p>}
    </div>
  </article>
)
