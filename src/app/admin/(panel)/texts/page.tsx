import type { Metadata } from 'next'
import { helpText } from '@/help'
import { locales, storefrontKeys, translate } from '@/i18n'
import { currentSettings } from '@/server/request'
import { runtime } from '@/server/runtime'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, HelpHint } from '@/ui/primitives'
import { adminContext } from '../context'
import { saveBusiness } from '../settings-actions'

export const metadata: Metadata = { title: 'Language texts' }

export default async function TextsPage() {
  const { allowed, locale, t } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const [{ business, version }, { config }] = await Promise.all([currentSettings(), runtime()])
  const shopLanguage = business.language.default ?? config.store.locale
  return (
    <>
      <h1 className="font-heading text-3xl">{t('texts.title')}</h1>
      <p className="text-sm text-muted">{t('texts.intro')}</p>
      <ActionForm action={saveBusiness} className="flex flex-col gap-4" saved={t('common.saved')}>
        <input type="hidden" name="version" value={version} />
        <input type="hidden" name="texts" value="1" />
        <Card>
          <fieldset className="flex flex-col gap-2">
            <legend className="flex items-center gap-1 font-semibold">
              {t('texts.language')}
              <HelpHint
                id="texts.language"
                text={helpText(locale, 'texts.language')}
                label={t('common.help')}
              />
            </legend>
            {locales.map((l) => (
              <label key={l} className="flex min-h-11 items-center gap-3">
                <input
                  type="radio"
                  name="language.default"
                  value={l}
                  defaultChecked={l === shopLanguage}
                  className="size-5 accent-[var(--color-accent)]"
                />
                {t(`texts.lang.${l}`)}
              </label>
            ))}
          </fieldset>
          <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
            {t('texts.switcher')}
            <input
              type="checkbox"
              name="language.switcher"
              defaultChecked={business.language.switcher}
              className="size-6 accent-[var(--color-accent)]"
            />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
            <span className="flex items-center gap-1">
              {t('texts.banglaDigits')}
              <HelpHint
                id="texts.banglaDigits"
                text={helpText(locale, 'texts.banglaDigits')}
                label={t('common.help')}
              />
            </span>
            <input
              type="checkbox"
              name="banglaDigits"
              defaultChecked={business.banglaDigits}
              className="size-6 accent-[var(--color-accent)]"
            />
          </label>
        </Card>
        <Card>
          <div className="flex items-center gap-1 font-semibold">
            {t('texts.wording')}
            <HelpHint
              id="texts.wording"
              text={helpText(locale, 'texts.wording')}
              label={t('common.help')}
            />
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {storefrontKeys.map((k) => (
              <li key={k} className="grid gap-2 py-3 md:grid-cols-2" data-testid={`text-${k}`}>
                {locales.map((l) => {
                  const fallback = translate(l, k)
                  return (
                    <input
                      key={l}
                      name={`${l}:${k}`}
                      aria-label={`${fallback} (${t(`texts.lang.${l}`)})`}
                      placeholder={fallback}
                      defaultValue={business.texts[l][k] ?? ''}
                      maxLength={300}
                      className="min-h-11 rounded-control border border-line bg-surface px-3 text-base outline-accent"
                    />
                  )
                })}
              </li>
            ))}
          </ul>
        </Card>
        <Button type="submit" icon="check" className="self-start">
          {t('common.save')}
        </Button>
      </ActionForm>
    </>
  )
}
