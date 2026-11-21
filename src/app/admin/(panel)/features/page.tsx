import type { Metadata } from 'next'
import { featureGroups } from '@/modules/plans'
import { runtime } from '@/server/runtime'
import { ActionForm } from '@/ui/action-form'
import { Icon } from '@/ui/icon'
import { Badge, LockBadge } from '@/ui/primitives'
import { adminContext } from '../context'
import { setFeature } from './actions'

export const metadata: Metadata = { title: 'Features' }

export default async function FeaturesPage() {
  const [{ features, store, allowed, t }, { config }] = await Promise.all([
    adminContext('settings.manage'),
    runtime(),
  ])
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const list = await features.list(store.id)
  const unlock = `https://wa.me/${config.rootLogicLab.whatsapp.replace(/\D/g, '')}`
  return (
    <>
      <h1 className="font-heading text-3xl">{t('features.title')}</h1>
      <p className="text-sm text-muted">{t('features.intro')}</p>
      {featureGroups.map((g) => (
        <section key={g} className="flex flex-col gap-3">
          <h2 className="font-heading text-xl">{t(`features.group.${g}`)}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {list
              .filter((f) => f.group === g)
              .map((f) => (
                <li
                  key={f.id}
                  data-testid={`module-${f.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface p-4"
                >
                  <span className="flex-1 font-semibold">{t(`plan.feature.${f.id}`)}</span>
                  {f.locked ? (
                    <a href={unlock} className="inline-flex min-h-11 items-center gap-2">
                      <LockBadge label={t('common.premium')} />
                      <Icon name="chat" size={16} />
                      <span className="sr-only">{t('common.unlock')}</span>
                    </a>
                  ) : (
                    <>
                      <Badge tone={f.enabled ? 'success' : 'accent'}>
                        {t(f.enabled ? 'features.on' : 'features.off')}
                      </Badge>
                      <ActionForm action={setFeature}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          name="op"
                          value={f.enabled ? 'off' : 'on'}
                          className="min-h-11 rounded-control border border-line px-3 text-sm font-semibold"
                        >
                          {t(f.enabled ? 'features.turnOff' : 'features.turnOn')}
                        </button>
                      </ActionForm>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  )
}
