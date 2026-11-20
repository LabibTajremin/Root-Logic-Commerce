'use server'

import { act, type ActionState } from './act'

/** Merges a partial business-settings patch from a form into the saved settings (version-locked). */
export async function saveBusiness(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ settings, store }) => {
    const current = await settings.get(store.id, { storeName: store.slug })
    const has = (k: string) => form.get(k) !== null
    const next = {
      ...current.business,
      ...(has('seo.titleTemplate') && {
        seo: {
          titleTemplate: String(form.get('seo.titleTemplate')),
          metaDescription: String(form.get('seo.metaDescription') ?? ''),
        },
        ga4MeasurementId: String(form.get('ga4MeasurementId') ?? '') || null,
      }),
      ...(has('otp') && {
        otp: { sms: form.get('otp.sms') === 'on', email: form.get('otp.email') === 'on' },
      }),
    }
    await settings.saveBusiness(store.id, next, Number(form.get('version')))
  })
}
