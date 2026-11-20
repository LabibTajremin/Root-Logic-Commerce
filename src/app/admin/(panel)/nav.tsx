'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/ui/icon'

export type NavItem = { href: string; label: string; icon: IconName }

const isActive = (path: string, href: string) =>
  href === '/admin' ? path === href : path.startsWith(href)

export const SideNav = ({ items }: { items: NavItem[] }) => {
  const path = usePathname()
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            aria-current={isActive(path, i.href) ? 'page' : undefined}
            className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm aria-[current=page]:bg-accent-tint aria-[current=page]:font-semibold aria-[current=page]:text-accent-ink"
          >
            <Icon name={i.icon} />
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

// Mobile: one-thumb bottom nav (≥44px targets).
export const BottomNav = ({ items }: { items: NavItem[] }) => {
  const path = usePathname()
  return (
    <ul className="grid grid-cols-5">
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            aria-current={isActive(path, i.href) ? 'page' : undefined}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted aria-[current=page]:font-semibold aria-[current=page]:text-accent-ink"
          >
            <Icon name={i.icon} size={22} />
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
