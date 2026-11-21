'use server'

import { locales, storefrontKeys } from '@/i18n'
import { act, type ActionState } from './act'
import { currentSettings } from '@/server/request'

/** Merges a partial business-settings patch from a form into the saved settings (version-locked). */
export async function saveBusiness(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ settings, store }) => {
    const current = await currentSettings()
    const has = (k: string) => form.get(k) !== null
    const next = {
      ...current.business,
      ...(has('seo.titleTemplate') && {
        seo: {
          titleTemplate: String(form.get('seo.titleTemplate')),
          metaDescription: form.get('seo.metaDescription') as string,
        },
        ga4MeasurementId: (form.get('ga4MeasurementId') as string) || null,
      }),
      ...(has('texts') && {
        banglaDigits: form.get('banglaDigits') === 'on',
        language: {
          default: form.get('language.default'),
          switcher: form.get('language.switcher') === 'on',
        },
        // Blank means "use the default wording", so only filled-in fields are kept.
        texts: Object.fromEntries(
          locales.map((l) => [
            l,
            Object.fromEntries(
              storefrontKeys.flatMap((k) => {
                const v = String(form.get(`${l}:${k}`)).trim()
                return v ? [[k, v]] : []
              }),
            ),
          ]),
        ),
      }),
      ...(has('otp') && {
        otp: { sms: form.get('otp.sms') === 'on', email: form.get('otp.email') === 'on' },
      }),
    }
    await settings.saveBusiness(store.id, next, Number(form.get('version')))
  })
}
