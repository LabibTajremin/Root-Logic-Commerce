import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon, type IconName } from '@/ui/icon'
import { adminContext } from '../context'

export const metadata: Metadata = { title: 'More' }

export default async function MorePage() {
  const { t } = await adminContext('orders.manage')
  const links: [string, string, IconName][] = [
    ['/admin/categories', 'nav.categories', 'layers'],
    ['/admin/promotions', 'nav.promotions', 'megaphone'],
    ['/admin/design', 'nav.design', 'palette'],
    ['/admin/messages', 'nav.messages', 'chat'],
    ['/admin/seo', 'nav.seo', 'trend'],
    ['/admin/users', 'nav.users', 'users'],
    ['/admin/features', 'nav.features', 'layers'],
    ['/admin/plan', 'nav.plan', 'star'],
    ['/admin/help', 'nav.help', 'help'],
  ]
  return (
    <>
      <h1 className="font-heading text-3xl">{t('more.title')}</h1>
      <ul className="divide-y divide-line rounded-card border border-line bg-surface">
        {links.map(([href, key, icon]) => (
          <li key={href}>
            <Link href={href} className="flex min-h-14 items-center gap-3 px-4">
              <Icon name={icon} className="text-accent-ink" />
              <span className="flex-1">{t(key)}</span>
              <Icon name="chevronRight" size={16} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
