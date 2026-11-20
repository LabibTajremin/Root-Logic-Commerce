import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon, type IconName } from '@/ui/icon'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'

export const metadata: Metadata = { title: 'Help' }

export default async function HelpPage() {
  const { t } = await adminContext('orders.manage')
  const sections: { title: string; icon: IconName; links: [string, string][] }[] = [
    {
      title: t('help.start'),
      icon: 'box',
      links: [
        [t('dash.step.category'), '/admin/categories'],
        [t('dash.step.product'), '/admin/products/new'],
        [t('dash.step.design'), '/admin/design'],
      ],
    },
    {
      title: t('help.orders'),
      icon: 'receipt',
      links: [
        [t('nav.orders'), '/admin/orders'],
        [t('nav.stock'), '/admin/stock'],
      ],
    },
    {
      title: t('help.design'),
      icon: 'palette',
      links: [
        [t('nav.design'), '/admin/design'],
        [t('nav.seo'), '/admin/seo'],
      ],
    },
  ]
  return (
    <>
      <h1 className="font-heading text-3xl">{t('help.title')}</h1>
      <p className="text-sm text-muted">{t('help.intro')}</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map((s) => (
          <Card key={s.title}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Icon name={s.icon} className="text-accent-ink" />
              {s.title}
            </h2>
            <ul>
              {s.links.map(([label, href]) => (
                <li key={href + label}>
                  <Link href={href} className="flex min-h-11 items-center justify-between text-sm">
                    {label}
                    <Icon name="chevronRight" size={16} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted">{t('help.contact')}</p>
    </>
  )
}
