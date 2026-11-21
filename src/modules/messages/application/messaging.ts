import { validate } from '@/modules/shared'
import { z } from 'zod'
import {
  backoffMs,
  MAX_ATTEMPTS,
  messageEvents,
  render,
  templateFor,
  type MessageEvent,
} from '../domain/templates'
import type {
  Deliver,
  OrderFacts,
  OutboxChannel,
  OutboxRepo,
  SavedTemplateRow,
  StoreFacts,
} from './ports'

type Deps = {
  repo: OutboxRepo
  order: (storeId: string, orderId: string) => Promise<OrderFacts | null>
  store: (storeId: string) => Promise<StoreFacts>
  deliver: Deliver
  now: () => Date
}
type OrderEvent = { storeId: string; orderId: string; orderNo: number }

const CHANNELS: OutboxChannel[] = ['email', 'sms', 'whatsapp']
const templateInput = z.object({
  event: z.enum(messageEvents),
  channel: z.enum(['email', 'sms']),
  locale: z.enum(['en', 'bn']),
  body: z.string().trim().min(1).max(1000),
  enabled: z.boolean(),
})

export const createMessaging = ({ repo, order, store, deliver, now }: Deps) => {
  const queue = async (event: MessageEvent, e: OrderEvent, o: OrderFacts, s: StoreFacts) => {
    const owner = event === 'order.new_owner'
    const saved = await repo.templates(e.storeId)
    const vars = { store: s.name, orderNo: o.orderNo, total: o.total, name: o.name, phone: o.phone }
    for (const channel of CHANNELS.filter((c) => s.channels[c])) {
      const to =
        channel === 'email' ? (owner ? s.ownerEmail : o.email) : owner ? s.ownerPhone : o.phone
      const t = templateFor(saved, event, channel, s.locale)
      if (!to || !t.enabled) continue
      await repo.enqueue(e.storeId, {
        channel,
        recipient: to,
        body: render(t.body, vars),
        dedupeKey: `${e.orderId}:${event}:${channel}:${to}`,
      })
    }
  }

  return {
    /** Event-bus subscriber: queues only — sending happens in processDue, never in checkout. */
    async onOrderEvent(event: Exclude<MessageEvent, 'order.new_owner'>, e: OrderEvent) {
      const [o, s] = await Promise.all([order(e.storeId, e.orderId), store(e.storeId)])
      if (!o) return
      await queue(event, e, o, s)
      if (event === 'order.placed') await queue('order.new_owner', e, o, s)
    },

    async processDue(limit = 20) {
      let sent = 0
      let failed = 0
      for (const r of await repo.claimDue(now(), limit)) {
        try {
          await deliver(r.storeId, r.channel, r.recipient, r.body)
          await repo.markSent(r.id)
          sent++
        } catch (e) {
          failed++
          const attempts = r.attempts + 1
          const error = String((e as Error).message).slice(0, 500)
          if (attempts >= MAX_ATTEMPTS) await repo.markFailed(r.id, attempts, error)
          else
            await repo.markRetry(
              r.id,
              attempts,
              new Date(now().getTime() + backoffMs(attempts)),
              error,
            )
        }
      }
      return { sent, failed }
    },

    templates: (storeId: string) => repo.templates(storeId),
    saveTemplate: async (storeId: string, input: SavedTemplateRow) =>
      repo.saveTemplate(storeId, validate(templateInput, input)),
    recent: (storeId: string, limit = 20) => repo.recent(storeId, limit),
  }
}

export type Messaging = ReturnType<typeof createMessaging>
