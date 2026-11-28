import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/ui/icon'
import { adminContext } from '../context'
import { menuGroups } from '../menu'

export const metadata: Metadata = { title: 'More' }

// Every screen, whatever the Simple/Pro choice — nothing is ever out of reach on a phone.
export default async function MorePage() {
  const { t } = await adminContext('orders.manage')
  return (
    <>
      <h1 className="font-heading text-3xl">{t('more.title')}</h1>
      {menuGroups.map((g) => (
        <section key={g.key} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t(g.key)}</h2>
          <ul className="divide-y divide-line rounded-card border border-line bg-surface">
            {g.items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="flex min-h-14 items-center gap-3 px-4">
                  <Icon name={i.icon} className="text-accent-ink" />
                  <span className="flex-1">{t(i.key)}</span>
                  <Icon name="chevronRight" size={16} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
