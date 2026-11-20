import type { Metadata } from 'next'
import { helpText } from '@/help'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, HelpHint } from '@/ui/primitives'
import { adminContext } from '../context'
import { saveBusiness } from '../settings-actions'
import { currentSettings } from '@/server/request'

export const metadata: Metadata = { title: 'Messages' }

export default async function MessagesPage() {
  const { allowed, locale, t } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const { business, version } = await currentSettings()
  return (
    <>
      <h1 className="font-heading text-3xl">{t('messages.title')}</h1>
      <Card>
        <ActionForm action={saveBusiness} className="flex flex-col gap-4" saved={t('common.saved')}>
          <input type="hidden" name="version" value={version} />
          <input type="hidden" name="otp" value="1" />
          <h2 className="flex items-center gap-1 font-semibold">
            {t('messages.otp')}
            <HelpHint id="otp" text={helpText(locale, 'messages.otp')} label={t('common.help')} />
          </h2>
          {(['sms', 'email'] as const).map((k) => (
            <label key={k} className="flex min-h-11 items-center justify-between gap-3">
              {t(k === 'sms' ? 'messages.otpSms' : 'messages.otpEmail')}
              <input
                type="checkbox"
                name={`otp.${k}`}
                defaultChecked={business.otp[k]}
                className="size-6 accent-[var(--color-accent)]"
              />
            </label>
          ))}
          <Button type="submit" icon="check">
            {t('common.save')}
          </Button>
        </ActionForm>
      </Card>
      <p className="text-sm text-muted">{t('messages.channels')}</p>
    </>
  )
}
