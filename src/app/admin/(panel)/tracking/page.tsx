import type { Metadata } from 'next'
import { metaSenders, purchaseTriggers, trackingPlan } from '@/modules/tracking'
import { currentSettings } from '@/server/request'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { saveTracking } from './actions'

export const metadata: Metadata = { title: 'Tracking' }

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'

/** H1/H2/H3: Meta + TikTok pixels with server events, GTM, extra GA4, Clarity, Search Console. */
export default async function TrackingPage() {
  const { t } = await adminContext('settings.manage')
  const { business } = await currentSettings()
  const tr = business.tracking
  const plan = trackingPlan(tr)
  const input = (name: string, label: string, value: string, type = 'text') => (
    <div className="flex flex-col gap-1.5 text-sm font-semibold">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={value}
        autoComplete="off"
        className={field}
      />
    </div>
  )
  const select = (name: string, label: string, value: string, options: readonly string[]) => (
    <div className="flex flex-col gap-1.5 text-sm font-semibold">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={value} className={field}>
        {options.map((o) => (
          <option key={o} value={o}>
            {t(`tracking.opt_${o}`)}
          </option>
        ))}
      </select>
    </div>
  )
  const secret = (name: string, label: string, saved: string) => (
    <div className="flex flex-col gap-1.5 text-sm font-semibold">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type="password"
        autoComplete="off"
        placeholder={saved ? t('tracking.tokenSaved') : ''}
        className={field}
      />
      {saved && (
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" name={`${name}.clear`} className="size-5" />
          {t('tracking.tokenRemove')}
        </label>
      )}
    </div>
  )
  return (
    <>
      <h1 className="font-heading text-3xl">{t('tracking.title')}</h1>
      <ActionForm action={saveTracking} className="flex flex-col gap-5" saved={t('common.saved')}>
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Meta (Facebook / Instagram)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {input('meta.pixelIds', t('tracking.metaPixels'), tr.meta.pixelIds.join(', '))}
            {select('meta.sender', t('tracking.sender'), tr.meta.sender, metaSenders)}
            {select('meta.trigger', t('tracking.trigger'), tr.meta.trigger, purchaseTriggers)}
            {secret('meta.capiToken', t('tracking.capiToken'), tr.meta.capiToken)}
            {input('meta.testCode', t('tracking.testCode'), tr.meta.testCode)}
            {input(
              'meta.domainVerification',
              t('tracking.domainVerification'),
              tr.meta.domainVerification,
            )}
          </div>
          <p className="text-sm text-muted">{t('tracking.triggerHelp')}</p>
          {plan.metaFallback && (
            <p
              role="note"
              className="rounded-control bg-warning/10 p-3 text-sm"
              data-testid="meta-fallback"
            >
              {t('tracking.metaFallback')}
            </p>
          )}
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">TikTok</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {input('tiktok.pixelId', t('tracking.tiktokPixel'), tr.tiktok.pixelId)}
            {secret('tiktok.token', t('tracking.tiktokToken'), tr.tiktok.token)}
            {select('tiktok.trigger', t('tracking.trigger'), tr.tiktok.trigger, purchaseTriggers)}
          </div>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">{t('tracking.tags')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {input('gtm', t('tracking.gtm'), tr.gtm)}
            {input('ga4Extra', t('tracking.ga4Extra'), tr.ga4Extra.join(', '))}
            {input('clarity', t('tracking.clarity'), tr.clarity)}
            {input('searchConsole', t('tracking.searchConsole'), tr.searchConsole)}
          </div>
          {tr.gtm && business.ga4MeasurementId && (
            <p
              role="note"
              className="rounded-control bg-warning/10 p-3 text-sm"
              data-testid="ga4-double"
            >
              {t('tracking.ga4Double')}
            </p>
          )}
          {tr.gtm && (
            <a
              href="/admin/tracking/gtm-container"
              download
              className="w-fit font-semibold underline"
            >
              {t('tracking.gtmDownload')}
            </a>
          )}
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">{t('tracking.feeds')}</h2>
          <p className="text-sm text-muted">{t('tracking.feedsHelp')}</p>
          {['/feeds/products.xml', '/feeds/products.csv'].map((f) => (
            <a key={f} href={f} className="w-fit font-semibold underline">
              {f}
            </a>
          ))}
        </Card>
        <button className="min-h-11 w-fit rounded-control bg-button px-4 font-semibold text-button-text">
          {t('common.save')}
        </button>
      </ActionForm>
    </>
  )
}
