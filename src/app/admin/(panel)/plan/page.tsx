import type { Metadata } from 'next'
import { Icon } from '@/ui/icon'
import { Badge, Card, LockBadge } from '@/ui/primitives'
import { runtime } from '@/server/runtime'
import { adminContext } from '../context'

export const metadata: Metadata = { title: 'Plan' }

export default async function PlanPage() {
  const [{ plans, store, t }, { config }] = await Promise.all([
    adminContext('orders.manage'),
    runtime(),
  ])
  const features = await plans.features(store.id)
  const unlock = `https://wa.me/${config.rootLogicLab.whatsapp.replace(/\D/g, '')}`
  return (
    <>
      <h1 className="font-heading text-3xl">{t('plan.title')}</h1>
      <p className="text-sm text-muted">{t('plan.free')}</p>
      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <ul className="flex flex-col gap-3">
          {features.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-card border border-line bg-surface p-4"
              data-testid={`feature-${f.id}`}
            >
              <span className="flex-1 font-semibold">{t(`plan.feature.${f.id}`)}</span>
              {f.unlocked ? (
                <Badge tone="success">{t('plan.included')}</Badge>
              ) : (
                <LockBadge label={t('common.premium')} />
              )}
            </li>
          ))}
        </ul>
        <Card className="flex flex-col gap-4 bg-button text-button-text">
          <p className="font-heading text-2xl">{t('common.premium')}</p>
          <a
            href={unlock}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-surface px-4 text-sm font-semibold text-text"
          >
            <Icon name="chat" size={18} />
            {t('common.unlock')}
          </a>
        </Card>
      </div>
    </>
  )
}
