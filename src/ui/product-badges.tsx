import type { CardBadge } from '@/modules/catalog'

/** A3 badges on a product card/page: "Save N%" then the owner's badge; themes pass the position. */
export const ProductBadges = ({ badges, className }: { badges: CardBadge[]; className: string }) =>
  badges.length > 0 && (
    <span className={`flex flex-col items-start gap-1 ${className}`}>
      {badges.map((b) => (
        <span
          key={b.text}
          data-tone={b.tone}
          className="rlc-badge rounded-full px-2.5 py-0.5 text-xs font-semibold"
        >
          {b.text}
        </span>
      ))}
    </span>
  )

/** A4: "Only N left" — shown only when the storefront computed a count. */
export const StockLeft = ({ n, label }: { n: number | null; label: string }) =>
  n !== null && (
    <p className="text-xs font-semibold text-warning">{label.replace('{{n}}', String(n))}</p>
  )
