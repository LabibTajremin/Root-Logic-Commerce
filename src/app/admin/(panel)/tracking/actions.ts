'use server'

import { currentSettings } from '@/server/request'
import { act, type ActionState } from '../act'

const list = (v: FormDataEntryValue | null) =>
  String(v ?? '')
    .split(/[\s,]+/)
    .filter(Boolean)

// Every key read is an input of the tracking form; a token field left empty keeps the saved one.
export async function saveTracking(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ settings, store, secrets }) => {
    const { business, version } = await currentSettings()
    const f = (k: string) => String(form.get(k)).trim()
    const token = (k: string, saved: string) =>
      form.get(`${k}.clear`) === 'on' ? '' : f(k) ? secrets.seal(f(k)) : saved
    const t = business.tracking
    await settings.saveBusiness(
      store.id,
      {
        ...business,
        tracking: {
          meta: {
            pixelIds: list(form.get('meta.pixelIds')),
            sender: f('meta.sender'),
            trigger: f('meta.trigger'),
            capiToken: token('meta.capiToken', t.meta.capiToken),
            testCode: f('meta.testCode'),
            domainVerification: f('meta.domainVerification'),
          },
          tiktok: {
            pixelId: f('tiktok.pixelId'),
            token: token('tiktok.token', t.tiktok.token),
            trigger: f('tiktok.trigger'),
          },
          gtm: f('gtm'),
          ga4Extra: list(form.get('ga4Extra')),
          clarity: f('clarity'),
          searchConsole: f('searchConsole'),
        },
      },
      version,
    )
  })
}
