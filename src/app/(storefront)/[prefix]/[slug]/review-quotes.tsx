type Quote = { id: string; rating: number; body: string; name: string }

/** H5: the product's approved reviews on its landing page; nothing until there is one. */
export const ReviewQuotes = ({
  title,
  reviews,
  stars,
}: {
  title: string
  reviews: Quote[]
  /** "{{n}} out of 5 stars" — the number is filled in per review. */
  stars: string
}) =>
  reviews.length > 0 && (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8">
      {title && <h2 className="font-heading text-2xl">{title}</h2>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {reviews.slice(0, 6).map((v) => (
          <li
            key={v.id}
            className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4"
          >
            <span aria-label={stars.replace('{{n}}', String(v.rating))}>
              {'★'.repeat(v.rating)}
            </span>
            <p>{v.body}</p>
            <span className="text-sm text-muted">{v.name}</span>
          </li>
        ))}
      </ul>
    </section>
  )
