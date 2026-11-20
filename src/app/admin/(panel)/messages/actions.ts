'use server'

import { currentSettings } from '@/server/request'
import { act, type ActionState } from '../act'

// Every key read here is an input of the channels form, so `get` never returns null.
const text = (f: FormData, k: string) => (f.get(k) as string).trim()
const on = (f: FormData, k: string) => f.get(k) === 'on'

export async function saveChannels(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ settings, secrets, store }) => {
    const { business } = await currentSettings()
    const m = business.messages
    // Secrets are write-only: a blank field keeps the one already saved.
    const secret = (k: string, saved: string) =>
      text(form, k) ? secrets.seal(text(form, k)) : saved
    const messages = {
      ownerPhone: text(form, 'ownerPhone'),
      ownerEmail: text(form, 'ownerEmail'),
      email: {
        enabled: on(form, 'email.enabled'),
        host: text(form, 'email.host'),
        port: Number(text(form, 'email.port')),
        user: text(form, 'email.user'),
        password: secret('email.password', m.email.password),
        from: text(form, 'email.from'),
      },
      sms: {
        enabled: on(form, 'sms.enabled'),
        url: text(form, 'sms.url'),
        apiKey: secret('sms.apiKey', m.sms.apiKey),
        sender: text(form, 'sms.sender'),
      },
      whatsapp: {
        enabled: on(form, 'whatsapp.enabled'),
        phoneNumberId: text(form, 'whatsapp.phoneNumberId'),
        token: secret('whatsapp.token', m.whatsapp.token),
      },
    }
    await settings.saveBusiness(store.id, { ...business, messages }, Number(form.get('version')))
  })
}

export async function saveTemplates(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ messaging, store }) => {
    const base = { event: text(form, 'event'), locale: text(form, 'locale') as 'en' | 'bn' }
    for (const channel of ['sms', 'email'] as const)
      await messaging.saveTemplate(store.id, {
        ...base,
        channel,
        body: text(form, `${channel}.body`),
        enabled: on(form, `${channel}.enabled`),
      })
  })
}
