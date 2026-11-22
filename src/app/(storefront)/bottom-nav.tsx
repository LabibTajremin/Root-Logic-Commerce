import Link from 'next/link'
import { Icon } from '@/ui/icon'
import { CartButton } from './cart-drawer'

/** B10: one-thumb navigation on phones (hidden from tablet width up). */
export const BottomNav = ({
  labels,
}: {
  labels: Record<'nav' | 'home' | 'search' | 'track' | 'cart', string>
}) => (
  <nav
    aria-label={labels.nav}
    className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
  >
    {(
      [
        ['/', 'home', 'home'],
        ['/search', 'search', 'search'],
        ['/track', 'track', 'receipt'],
      ] as const
    ).map(([href, key, icon]) => (
      <Link
        key={href}
        href={href}
        className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted"
      >
        <Icon name={icon} size={22} />
        {labels[key]}
      </Link>
    ))}
    <div className="flex min-h-14 items-center justify-center">
      <CartButton label={labels.cart} />
    </div>
  </nav>
)
