'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/ui/icon'

export type NavItem = { href: string; label: string; icon: IconName }
export type NavGroup = { label: string; items: NavItem[] }

const isActive = (path: string, href: string) =>
  href === '/admin' ? path === href : path.startsWith(href)

export const SideNav = ({ groups }: { groups: NavGroup[] }) => {
  const path = usePathname()
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.label} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {g.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((i) => (
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
        </section>
      ))}
    </div>
  )
}

/** Simple | Pro switch; Simple hides the advanced screens (they stay reachable from More). */
export const ModeToggle = ({ mode, labels }: { mode: string; labels: Record<string, string> }) => {
  const back = usePathname()
  return (
    <nav
      aria-label={labels.label}
      className="grid grid-cols-2 rounded-control bg-soft p-0.5 text-sm font-semibold"
    >
      {(['simple', 'pro'] as const).map((m) => (
        <a
          key={m}
          href={`/admin/mode?to=${m}&back=${encodeURIComponent(back)}`}
          aria-current={m === mode ? 'true' : undefined}
          className="flex min-h-9 items-center justify-center rounded-control text-muted aria-[current]:bg-surface aria-[current]:text-text"
        >
          {labels[m]}
        </a>
      ))}
    </nav>
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
