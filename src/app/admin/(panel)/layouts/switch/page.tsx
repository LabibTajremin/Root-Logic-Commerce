import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { demoPacks } from '@/modules/catalog'
import { isPresetId } from '@/sections/registry'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { switchLayout } from '../actions'

export const metadata: Metadata = { title: 'Switch layout' }

const choices = ['mine', 'demo', 'both', 'fresh'] as const

/** J3: before switching, what happens to "yours vs demo" products. */
export default async function SwitchPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>
}) {
  const { preset = '' } = await searchParams
  if (!isPresetId(preset)) notFound()
  const { allowed, t, catalog, store } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const counts = await catalog.demoCounts(store.id)
  return (
    <>
      <h1 className="font-heading text-3xl">
        {t('switch.title', { name: t(`layouts.preset.${preset}`) })}
      </h1>
      <p className="text-sm text-muted" data-testid="switch-counts">
        {t('switch.counts', { mine: counts.mine, demo: demoPacks[preset].length })}
      </p>
      <ul className="grid gap-4 md:grid-cols-2">
        {choices.map((c) => (
          <li key={c}>
            <Card className="h-full">
              <ActionForm action={switchLayout} className="flex h-full flex-col gap-3">
                <input type="hidden" name="preset" value={preset} />
                <input type="hidden" name="choice" value={c} />
                <h2 className="font-heading text-xl">{t(`switch.${c}`)}</h2>
                <p className="flex-1 text-sm text-muted">{t(`switch.${c}Body`)}</p>
                {c === 'fresh' && (
                  <>
                    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" name="sure" className="size-5" />
                      {t('switch.sure', { n: counts.mine })}
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor="confirm">
                      {t('switch.typeFresh')}
                      <input
                        id="confirm"
                        name="confirm"
                        autoComplete="off"
                        className="min-h-11 rounded-control border border-line bg-surface px-3 font-normal"
                      />
                    </label>
                  </>
                )}
                <button className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text">
                  {t(`switch.${c}Button`)}
                </button>
              </ActionForm>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}
