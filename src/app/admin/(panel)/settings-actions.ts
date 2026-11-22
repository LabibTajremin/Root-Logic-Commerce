'use server'

import { locales, storefrontKeys } from '@/i18n'
import { act, type ActionState } from './act'
import { cookies } from 'next/headers'
import { currentLocale, currentSettings } from '@/server/request'

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
        currency: form.get('currency'),
        dateFormat: form.get('dateFormat'),
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
      ...(has('contact.phone') && {
        contact: {
          phone: String(form.get('contact.phone')).trim(),
          whatsapp: String(form.get('contact.whatsapp')).trim(),
          messenger: String(form.get('contact.messenger')).trim(),
          address: String(form.get('contact.address')).trim(),
          mapUrl: String(form.get('contact.mapUrl')).trim(),
        },
        showStockLeft: form.get('showStockLeft') === 'on',
      }),
      ...(has('otp') && {
        otp: { sms: form.get('otp.sms') === 'on', email: form.get('otp.email') === 'on' },
      }),
    }
    // Changing the shop language must not flip the owner's own admin language mid-edit.
    if (has('texts')) {
      const jar = await cookies()
      if (!jar.get('lang'))
        jar.set('lang', await currentLocale(), { path: '/', maxAge: 31536000, sameSite: 'lax' })
    }
    await settings.saveBusiness(store.id, next, Number(form.get('version')))
  })
}
