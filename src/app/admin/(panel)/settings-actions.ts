'use server'

import { bdDistricts } from '@/modules/orders'
import { locales, storefrontKeys } from '@/i18n'
import { act, type ActionState } from './act'
import { cookies } from 'next/headers'
import { currentLocale, currentSettings } from '@/server/request'
import { bandsFromText } from '@/modules/site-settings'

// An empty taka box means "no limit".
const optionalMinor = (v: FormDataEntryValue | null) =>
  String(v) === '' ? null : Math.round(Number(v) * 100)

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
        trust: {
          ...current.business.trust,
          footer: form.get('trust.footer') === 'on',
          tradeLicence: String(form.get('trust.tradeLicence')),
          tin: String(form.get('trust.tin')),
          bin: String(form.get('trust.bin')),
          dbid: String(form.get('trust.dbid')),
          warranty: String(form.get('trust.warranty')),
        },
        budgetBands: bandsFromText(String(form.get('budgetBands'))),
        freeShipping: {
          minSubtotal: optionalMinor(form.get('free.min')),
          zoneIds: form.getAll('free.zones').map(String),
          productIds: form.getAll('free.products').map(String),
        },
        orderLimits: {
          minOrder: optionalMinor(form.get('limits.min')),
          maxOrder: optionalMinor(form.get('limits.max')),
        },
        // B2: on/off here; the order is saved by dragging (reorderOrderPaths).
        orderPaths: {
          buttons: current.business.orderPaths.buttons.map((b) => ({
            ...b,
            on: form.getAll('paths.on').includes(b.id),
          })),
          stickyBar: form.get('paths.sticky') === 'on',
        },
        address: {
          mode: String(form.get('address.mode')) as 'text',
          // Districts left on "Any other" are simply not listed.
          districtZones: Object.fromEntries(
            bdDistricts.flatMap((d) => {
              const zone = String(form.get(`zone.${d.en}`))
              return zone ? [[d.en, zone]] : []
            }),
          ),
          otherZone: String(form.get('zone.other')),
        },
        thankYou: {
          heading: String(form.get('ty.heading')),
          sub: String(form.get('ty.sub')),
          message: String(form.get('ty.message')),
          accent: String(form.get('ty.accent')),
          home: form.get('ty.home') === 'on',
          invoice: form.get('ty.invoice') === 'on',
          whatsapp: form.get('ty.whatsapp') === 'on',
        },
        checkout: {
          email: String(form.get('checkout.email')) as 'optional',
          altPhone: form.get('checkout.altPhone') === 'on',
          preferredTime: form.get('checkout.preferredTime') === 'on',
          giftWrap: form.get('checkout.giftWrap') === 'on',
        },
      }),
      ...(has('fraud.perWindow') && {
        fraud: {
          perWindow: Number(form.get('fraud.perWindow')),
          windowHours: Number(form.get('fraud.windowHours')),
          duplicateHours: Number(form.get('fraud.duplicateHours')),
          blockDuplicates: form.get('fraud.blockDuplicates') === 'on',
          // D2 fields show only with the courier score module; keep the saved rule otherwise.
          score: has('fraud.score.minPct')
            ? {
                minPct: Number(form.get('fraud.score.minPct')),
                minOrders: Number(form.get('fraud.score.minOrders')),
                action: String(form.get('fraud.score.action')) as 'hold',
              }
            : current.business.fraud.score,
        },
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

/** B2: the dragged order of the product page's order buttons. */
export async function reorderOrderPaths(ids: string[]) {
  return act('settings.manage', async ({ settings, store }) => {
    const { business, version } = await currentSettings()
    const by = new Map(business.orderPaths.buttons.map((b) => [b.id as string, b]))
    const buttons = ids.map((id) => by.get(id)).filter((b): b is NonNullable<typeof b> => !!b)
    await settings.saveBusiness(
      store.id,
      { ...business, orderPaths: { ...business.orderPaths, buttons } },
      version,
    )
  })
}

/** B6: a certificate photo added to the trust strip. `file`/`caption` are inputs of its form. */
export async function addCertificate(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ media, settings, store }) => {
    const bytes = new Uint8Array(await (form.get('file') as File).arrayBuffer())
    const m = await media.upload(store.id, 'certificate', bytes)
    const { business, version } = await currentSettings()
    const certificates = [
      ...business.trust.certificates,
      { id: m.id, caption: String(form.get('caption')) },
    ]
    await settings.saveBusiness(
      store.id,
      { ...business, trust: { ...business.trust, certificates } },
      version,
    )
  })
}

export async function removeCertificate(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ settings, store }) => {
    const { business, version } = await currentSettings()
    const certificates = business.trust.certificates.filter((c) => c.id !== form.get('id'))
    await settings.saveBusiness(
      store.id,
      { ...business, trust: { ...business.trust, certificates } },
      version,
    )
  })
}
