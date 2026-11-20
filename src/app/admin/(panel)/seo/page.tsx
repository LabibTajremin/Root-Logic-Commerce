import type { Metadata } from 'next'
import { helpText } from '@/help'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, Field, LockBadge } from '@/ui/primitives'
import { adminContext } from '../context'
import { saveBusiness } from '../settings-actions'

export const metadata: Metadata = { title: 'SEO & Analytics' }

export default async function SeoPage() {
  const { settings, plans, store, allowed, locale, t } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const [{ business, version }, features] = await Promise.all([
    settings.get(store.id, { storeName: store.slug }),
    plans.features(store.id),
  ])
  const locked = features.filter((f) => !f.unlocked).map((f) => f.id)
  return (
    <>
      <h1 className="font-heading text-3xl">{t('seo.title')}</h1>
      <Card>
        <ActionForm action={saveBusiness} className="flex flex-col gap-4" saved={t('common.saved')}>
          <input type="hidden" name="version" value={version} />
          <Field
            id="seo.titleTemplate"
            name="seo.titleTemplate"
            defaultValue={business.seo.titleTemplate}
            label={t('seo.template')}
            help={helpText(locale, 'seo.template')}
            helpLabel={t('common.help')}
          />
          <Field
            id="seo.metaDescription"
            name="seo.metaDescription"
            maxLength={170}
            defaultValue={business.seo.metaDescription}
            label={t('seo.description')}
            help={helpText(locale, 'seo.description')}
            helpLabel={t('common.help')}
          />
          <Field
            id="ga4MeasurementId"
            name="ga4MeasurementId"
            placeholder="G-XXXXXXXXXX"
            defaultValue={business.ga4MeasurementId ?? ''}
            label={t('seo.ga4')}
            help={helpText(locale, 'seo.ga4')}
            helpLabel={t('common.help')}
          />
          <Button type="submit" icon="check">
            {t('common.save')}
          </Button>
        </ActionForm>
      </Card>
      {(['ga4InAdmin', 'seoPro'] as const).map((id) => (
        <Card key={id} className="flex items-center justify-between gap-3">
          <span className="font-semibold">{t(id === 'seoPro' ? 'seo.pro' : 'seo.ga4Admin')}</span>
          {locked.includes(id) && <LockBadge label={t('common.premium')} />}
        </Card>
      ))}
    </>
  )
}
