import Link from 'next/link'
import { Icon } from '@/ui/icon'
import { CartButton } from './cart-drawer'

/** B10: one-thumb navigation on phones (hidden from tablet width up). */
const links = [
  ['/', 'home', 'home'],
  ['/search', 'search', 'search'],
  ['/track', 'track', 'receipt'],
] as const

export const BottomNav = ({
  labels,
  items,
}: {
  labels: Record<'nav' | 'home' | 'search' | 'track' | 'cart', string>
  items: Record<'search' | 'track' | 'cart', boolean>
}) => {
  const shown = links.filter(([, key]) => key === 'home' || items[key])
  return (
    <nav
      aria-label={labels.nav}
      style={{
        gridTemplateColumns: `repeat(${shown.length + Number(items.cart)}, minmax(0, 1fr))`,
      }}
      className="fixed inset-x-0 bottom-0 z-20 grid border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {shown.map(([href, key, icon]) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted"
        >
          <Icon name={icon} size={22} />
          {labels[key]}
        </Link>
      ))}
      {items.cart && (
        <div className="flex min-h-14 items-center justify-center">
          <CartButton label={labels.cart} />
        </div>
      )}
    </nav>
  )
}
