import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card, LockBadge } from '@/ui/primitives'
import { adminContext } from '../context'

/** E1–E5: every courier screen needs the (paid) courier module; the tabs link them. */
export default async function CouriersLayout({ children }: { children: ReactNode }) {
  const { features, store, t } = await adminContext('orders.manage')
  const on = await features.isOn(store.id, 'courier')
  return (
    <>
      <h1 className="font-heading text-3xl">{t('courier.title')}</h1>
      {on ? (
        <>
          <nav aria-label={t('courier.title')} className="flex flex-wrap gap-2 text-sm">
            {[
              ['/admin/couriers', 'courier.accounts'],
              ['/admin/couriers/report', 'courier.report'],
              ['/admin/couriers/payouts', 'courier.payouts'],
            ].map(([href, key]) => (
              <Link
                key={href}
                href={href!}
                className="inline-flex min-h-11 items-center rounded-control border border-line px-4 font-semibold"
              >
                {t(key!)}
              </Link>
            ))}
          </nav>
          {children}
        </>
      ) : (
        <Card className="flex flex-col items-start gap-3">
          <LockBadge label={t('common.premium')} />
          <p className="text-sm text-muted">{t('courier.locked')}</p>
          <Link href="/admin/plan" className="font-semibold underline">
            {t('nav.plan')}
          </Link>
        </Card>
      )}
    </>
  )
}
