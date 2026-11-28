import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card, LockBadge } from '@/ui/primitives'
import { adminContext } from '../context'

/** H5: landing pages are a paid module; every screen here needs it. */
export default async function LandingLayout({ children }: { children: ReactNode }) {
  const { features, store, t } = await adminContext('settings.manage')
  const on = await features.isOn(store.id, 'landingPages')
  return on ? (
    children
  ) : (
    <>
      <h1 className="font-heading text-3xl">{t('landing.title')}</h1>
      <Card className="flex flex-col items-start gap-3">
        <LockBadge label={t('common.premium')} />
        <p className="text-sm text-muted">{t('landing.locked')}</p>
        <Link href="/admin/plan" className="font-semibold underline">
          {t('nav.plan')}
        </Link>
      </Card>
    </>
  )
}
