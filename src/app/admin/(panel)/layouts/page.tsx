import type { Metadata } from 'next'
import { currentSettings } from '@/server/request'
import { layoutOf, presetIds, presetLayout, resolveSections } from '@/sections/registry'
import { ActionForm } from '@/ui/action-form'
import { Badge } from '@/ui/primitives'
import { adminContext } from '../context'
import { applyLayout, previewLayout, toggleSection } from './actions'

export const metadata: Metadata = { title: 'Layouts' }

const button = 'min-h-11 rounded-control border border-line px-4 text-sm font-semibold'

export default async function LayoutsPage() {
  const [{ allowed, t }, settings] = await Promise.all([
    adminContext('settings.manage'),
    currentSettings(),
  ])
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const layout = layoutOf(settings.layout)
  const current = layout.preset
  return (
    <>
      <h1 className="font-heading text-3xl">{t('layouts.title')}</h1>
      <p className="text-sm text-muted">{t('layouts.intro')}</p>
      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <h2 className="font-heading text-xl">{t('layouts.sections')}</h2>
        <p className="text-sm text-muted">{t('layouts.sectionsHint')}</p>
        <ul className="flex flex-col divide-y divide-line">
          {layout.home.map((r, i) => (
            <li
              key={`${r.sectionId}-${i}`}
              data-testid={`section-${r.sectionId}`}
              className="flex min-h-14 items-center gap-3"
            >
              <span className="flex-1 font-semibold">{t(`sections.${r.sectionId}`)}</span>
              <Badge tone={r.enabled ? 'success' : 'accent'}>
                {t(r.enabled ? 'features.on' : 'features.off')}
              </Badge>
              <ActionForm action={toggleSection}>
                <input type="hidden" name="index" value={i} />
                <button className={button}>
                  {t(r.enabled ? 'features.turnOff' : 'features.turnOn')}
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
      </section>
      <h2 className="font-heading text-xl">{t('layouts.gallery')}</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {presetIds.map((id) => (
          <li
            key={id}
            data-testid={`layout-${id}`}
            className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <h2 className="flex-1 font-heading text-xl">{t(`layouts.preset.${id}`)}</h2>
              {id === current && <Badge tone="success">{t('layouts.current')}</Badge>}
            </div>
            <p className="text-sm text-muted">{t(`layouts.presetBody.${id}`)}</p>
            {/* The "picture": the home page's blocks in order. */}
            <ol className="flex flex-col gap-1 rounded-control bg-bg p-3 text-xs">
              {resolveSections(presetLayout(id).home).map((s) => (
                <li key={s.id} className="rounded-control border border-line px-2 py-1">
                  {t(`sections.${s.id}`)}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <ActionForm action={previewLayout}>
                <input type="hidden" name="preset" value={id} />
                <button className={button}>{t('layouts.preview')}</button>
              </ActionForm>
              <ActionForm action={applyLayout} saved={t('common.saved')}>
                <input type="hidden" name="preset" value={id} />
                <button className={`${button} bg-button text-button-text`}>
                  {t('layouts.use')}
                </button>
              </ActionForm>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
