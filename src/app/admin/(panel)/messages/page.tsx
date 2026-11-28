import type { Metadata } from 'next'
import { helpText } from '@/help'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card, Field, HelpHint } from '@/ui/primitives'
import { adminContext } from '../context'
import { messageEvents, templateFor, type MessageEvent } from '@/modules/messages'
import { saveBusiness } from '../settings-actions'
import { saveChannels, saveTemplates } from './actions'
import { currentSettings } from '@/server/request'

export const metadata: Metadata = { title: 'Messages' }

type Search = Promise<{ event?: string; lang?: string }>

const TONE = { pending: 'warning', sent: 'success', failed: 'danger' } as const

export default async function MessagesPage({ searchParams }: { searchParams: Search }) {
  const { allowed, locale, messaging, store, t } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const { business, version } = await currentSettings()
  const q = await searchParams
  const event = messageEvents.find((e) => e === q.event) ?? 'order.placed'
  const lang = q.lang === 'bn' ? 'bn' : 'en'
  const [saved, recent] = await Promise.all([
    messaging.templates(store.id),
    messaging.recent(store.id),
  ])
  const m = business.messages
  const help = (k: string) => helpText(locale, k)
  const f = (id: string, label: string, props: Record<string, unknown>) => (
    <Field
      id={id}
      name={id}
      label={t(label)}
      help={help(`messages.${id.startsWith('owner') ? 'owner' : id.split('.')[0]}`)}
      helpLabel={t('common.help')}
      {...props}
    />
  )
  const secret = (id: string, label: string, saved: string) =>
    f(id, label, {
      type: 'password',
      autoComplete: 'off',
      placeholder: saved ? t('messages.secretSaved') : '',
    })
  const toggle = (id: string, checked: boolean) => (
    <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
      {t('messages.enabled')}
      <input
        type="checkbox"
        name={id}
        defaultChecked={checked}
        className="size-6 accent-[var(--color-accent)]"
      />
    </label>
  )
  const section = (title: string, helpKey: string, children: React.ReactNode) => (
    <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
      <legend className="flex items-center gap-1 px-1 font-semibold">
        {t(title)}
        <HelpHint id={helpKey} text={help(helpKey)} label={t('common.help')} />
      </legend>
      {children}
    </fieldset>
  )
  const tpl = (channel: 'sms' | 'email') => templateFor(saved, event as MessageEvent, channel, lang)
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
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted">{t('messages.channels')}</p>
        <ActionForm action={saveChannels} className="flex flex-col gap-4" saved={t('common.saved')}>
          <input type="hidden" name="version" value={version} />
          {section(
            'messages.owner',
            'messages.owner',
            <>
              {f('ownerPhone', 'messages.ownerPhone', { defaultValue: m.ownerPhone, type: 'tel' })}
              {f('ownerEmail', 'messages.ownerEmail', {
                defaultValue: m.ownerEmail,
                type: 'email',
              })}
            </>,
          )}
          {section(
            'messages.email',
            'messages.email',
            <>
              {toggle('email.enabled', m.email.enabled)}
              {f('email.host', 'messages.host', { defaultValue: m.email.host })}
              {f('email.port', 'messages.port', {
                defaultValue: m.email.port,
                type: 'number',
                min: 1,
                max: 65535,
              })}
              {f('email.user', 'messages.user', {
                defaultValue: m.email.user,
                autoComplete: 'off',
              })}
              {secret('email.password', 'messages.password', m.email.password)}
              {f('email.from', 'messages.from', { defaultValue: m.email.from })}
            </>,
          )}
          {section(
            'messages.sms',
            'messages.sms',
            <>
              {toggle('sms.enabled', m.sms.enabled)}
              {f('sms.url', 'messages.smsUrl', {
                defaultValue: m.sms.url,
                type: 'url',
                placeholder: 'https://…?to={{to}}&text={{text}}',
              })}
              {secret('sms.apiKey', 'messages.apiKey', m.sms.apiKey)}
              {f('sms.sender', 'messages.sender', { defaultValue: m.sms.sender })}
            </>,
          )}
          {section(
            'messages.whatsapp',
            'messages.whatsapp',
            <>
              {toggle('whatsapp.enabled', m.whatsapp.enabled)}
              {f('whatsapp.phoneNumberId', 'messages.phoneNumberId', {
                defaultValue: m.whatsapp.phoneNumberId,
                inputMode: 'numeric',
              })}
              {secret('whatsapp.token', 'messages.token', m.whatsapp.token)}
            </>,
          )}
          <Button type="submit" icon="check">
            {t('common.save')}
          </Button>
        </ActionForm>
      </Card>
      <Card className="flex flex-col gap-4">
        <h2 className="flex items-center gap-1 font-semibold">
          {t('messages.templates')}
          <HelpHint id="templates" text={help('messages.templates')} label={t('common.help')} />
        </h2>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('messages.event')}
            <select
              name="event"
              defaultValue={event}
              className="min-h-11 rounded-control border border-line bg-surface px-3"
            >
              {messageEvents.map((e) => (
                <option key={e} value={e}>
                  {t(`event.${e}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('messages.language')}
            <select
              name="lang"
              defaultValue={lang}
              className="min-h-11 rounded-control border border-line bg-surface px-3"
            >
              <option value="en">English</option>
              <option value="bn">বাংলা</option>
            </select>
          </label>
          <Button variant="secondary">{t('common.view')}</Button>
        </form>
        <ActionForm
          key={`${event}-${lang}`}
          action={saveTemplates}
          className="flex flex-col gap-4"
          saved={t('common.saved')}
        >
          <input type="hidden" name="event" value={event} />
          <input type="hidden" name="locale" value={lang} />
          <p className="text-sm text-muted">{t('messages.vars')}</p>
          {(['sms', 'email'] as const).map((c) => (
            <div key={c} className="flex flex-col gap-1.5">
              <label htmlFor={`${c}.body`} className="text-sm font-semibold">
                {t(c === 'sms' ? 'messages.short' : 'messages.emailBody')}
              </label>
              <textarea
                id={`${c}.body`}
                name={`${c}.body`}
                required
                maxLength={1000}
                rows={c === 'sms' ? 2 : 4}
                defaultValue={tpl(c).body}
                className="rounded-control border border-line bg-surface p-3"
              />
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`${c}.enabled`}
                  defaultChecked={tpl(c).enabled}
                  className="size-5 accent-[var(--color-accent)]"
                />
                {t('messages.sendThis')}
              </label>
            </div>
          ))}
          <Button type="submit" icon="check">
            {t('common.save')}
          </Button>
        </ActionForm>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('messages.recent')}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">{t('messages.none')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line text-sm" data-testid="outbox">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <Badge tone={TONE[r.status as keyof typeof TONE]}>{t(`outbox.${r.status}`)}</Badge>
                <span className="font-semibold">{r.channel.toUpperCase()}</span>
                <span className="text-muted">{r.recipient}</span>
                <span className="w-full truncate">{r.body}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
