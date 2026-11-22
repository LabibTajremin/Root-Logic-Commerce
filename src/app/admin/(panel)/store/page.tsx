import type { Metadata } from 'next'
import { helpText } from '@/help'
import { currentSettings } from '@/server/request'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, Field } from '@/ui/primitives'
import { adminContext } from '../context'
import { saveBusiness } from '../settings-actions'

export const metadata: Metadata = { title: 'Shop info' }

const FIELDS = ['phone', 'whatsapp', 'messenger', 'address', 'mapUrl'] as const

/** Contact details shoppers see (help bubble, contact page, invoices). */
export default async function StorePage() {
  const { allowed, locale, t } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const { business, version } = await currentSettings()
  return (
    <>
      <h1 className="font-heading text-3xl">{t('store.title')}</h1>
      <p className="text-sm text-muted">{t('store.intro')}</p>
      <Card>
        <ActionForm action={saveBusiness} className="flex flex-col gap-4" saved={t('common.saved')}>
          <input type="hidden" name="version" value={version} />
          {FIELDS.map((f) => (
            <Field
              key={f}
              id={`contact.${f}`}
              name={`contact.${f}`}
              defaultValue={business.contact[f]}
              label={t(`store.${f}`)}
              help={helpText(locale, `store.${f}`)}
              helpLabel={t('common.help')}
            />
          ))}
          <Button type="submit" icon="check" className="self-start">
            {t('common.save')}
          </Button>
        </ActionForm>
      </Card>
    </>
  )
}
