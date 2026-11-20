import { createTransport } from 'nodemailer'
import type { Deliver } from '@/modules/messages'
import type { Business } from '@/modules/site-settings'
import type { SecretBox } from '../crypto/secret-box'
import { createLogNotifier } from './log-notifier'

type Deps = {
  /** 'log' (dev/e2e) records messages instead of sending them. */
  mode: 'live' | 'log'
  logFile: string | undefined
  settings: (storeId: string) => Promise<{ business: Business; storeName: string }>
  box: SecretBox
  fetcher?: typeof fetch
  mailer?: typeof createTransport
}

const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => encodeURIComponent(vars[k] ?? ''))

export const createDeliver = ({
  mode,
  logFile,
  settings,
  box,
  fetcher = fetch,
  mailer = createTransport,
}: Deps): Deliver => {
  if (mode === 'log') {
    const log = createLogNotifier(logFile)
    return (_storeId, channel, to, text) => log(channel, to, text)
  }
  return async (storeId, channel, to, text) => {
    const { business, storeName } = await settings(storeId)
    const m = business.messages
    if (channel === 'email') {
      await mailer({
        host: m.email.host,
        port: m.email.port,
        secure: m.email.port === 465,
        auth: { user: m.email.user, pass: box.open(m.email.password) },
      }).sendMail({ from: m.email.from, to, subject: storeName, text })
      return
    }
    const res =
      channel === 'sms'
        ? await fetcher(
            fill(m.sms.url, { to, text, sender: m.sms.sender, apiKey: box.open(m.sms.apiKey) }),
          )
        : await fetcher(`https://graph.facebook.com/v21.0/${m.whatsapp.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${box.open(m.whatsapp.token)}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: `88${to}`,
              type: 'text',
              text: { body: text },
            }),
          })
    if (!res.ok) throw new Error(`${channel} gateway answered ${res.status}`)
  }
}
