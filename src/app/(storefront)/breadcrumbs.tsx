import { breadcrumbLd, JsonLd } from './json-ld'

export type Crumb = { name: string; path: string }

/** A11: visible trail plus the matching BreadcrumbList JSON-LD. */
export const Breadcrumbs = ({
  base,
  items,
  label,
}: {
  base: string
  items: Crumb[]
  label: string
}) => (
  <nav aria-label={label}>
    <JsonLd data={breadcrumbLd(base, items)} />
    <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
      {items.map((c, i) => (
        <li key={c.path} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>/</span>}
          {i < items.length - 1 ? (
            <a href={c.path} className="underline">
              {c.name}
            </a>
          ) : (
            <span aria-current="page">{c.name}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
)
