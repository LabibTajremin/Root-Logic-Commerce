export const messageEvents = [
  'order.placed',
  'order.confirmed',
  'order.shipped',
  'order.delivered',
  'order.cancelled',
  'order.new_owner',
] as const
export type MessageEvent = (typeof messageEvents)[number]
export type Channel = 'email' | 'sms' | 'whatsapp'
type Locale = 'en' | 'bn'
/** SMS and WhatsApp share the short text; email gets a longer one. */
type Variant = { short: string; email: string }

const T = (short: string, email: string): Variant => ({ short, email })

export const defaultTemplates: Record<MessageEvent, Record<Locale, Variant>> = {
  'order.placed': {
    en: T(
      '{{store}}: we got your order #{{orderNo}} ({{total}}). We will call to confirm.',
      'Thank you, {{name}}! We received your order #{{orderNo}} for {{total}}, cash on delivery. We will call you shortly to confirm it.',
    ),
    bn: T(
      '{{store}}: আপনার অর্ডার #{{orderNo}} ({{total}}) পেয়েছি। কনফার্ম করতে কল করব।',
      'ধন্যবাদ, {{name}}! আপনার অর্ডার #{{orderNo}} ({{total}}, ক্যাশ অন ডেলিভারি) আমরা পেয়েছি। কনফার্ম করতে শীঘ্রই কল করব।',
    ),
  },
  'order.confirmed': {
    en: T(
      '{{store}}: order #{{orderNo}} is confirmed.',
      'Good news, {{name}} — your order #{{orderNo}} is confirmed and being prepared.',
    ),
    bn: T(
      '{{store}}: অর্ডার #{{orderNo}} কনফার্ম হয়েছে।',
      'সুখবর, {{name}} — আপনার অর্ডার #{{orderNo}} কনফার্ম হয়েছে, প্রস্তুত করা হচ্ছে।',
    ),
  },
  'order.shipped': {
    en: T(
      '{{store}}: order #{{orderNo}} is on the way.',
      'Your order #{{orderNo}} has been handed to delivery and is on the way, {{name}}.',
    ),
    bn: T(
      '{{store}}: অর্ডার #{{orderNo}} পাঠানো হয়েছে।',
      '{{name}}, আপনার অর্ডার #{{orderNo}} ডেলিভারিতে দেওয়া হয়েছে, পথে আছে।',
    ),
  },
  'order.delivered': {
    en: T(
      '{{store}}: order #{{orderNo}} delivered. Thank you!',
      'Your order #{{orderNo}} was delivered. Thank you for shopping with {{store}}, {{name}}!',
    ),
    bn: T(
      '{{store}}: অর্ডার #{{orderNo}} ডেলিভারি হয়েছে। ধন্যবাদ!',
      'আপনার অর্ডার #{{orderNo}} ডেলিভারি হয়েছে। {{store}} থেকে কেনাকাটার জন্য ধন্যবাদ, {{name}}!',
    ),
  },
  'order.cancelled': {
    en: T(
      '{{store}}: order #{{orderNo}} was cancelled.',
      'Your order #{{orderNo}} was cancelled. Reply or call us if this is a mistake, {{name}}.',
    ),
    bn: T(
      '{{store}}: অর্ডার #{{orderNo}} বাতিল হয়েছে।',
      '{{name}}, আপনার অর্ডার #{{orderNo}} বাতিল হয়েছে। ভুল হলে আমাদের জানান।',
    ),
  },
  'order.new_owner': {
    en: T(
      'New order #{{orderNo}}: {{total}} from {{name}} ({{phone}}).',
      'New order #{{orderNo}} — {{total}} from {{name}}, {{phone}}. Open the admin panel to confirm it.',
    ),
    bn: T(
      'নতুন অর্ডার #{{orderNo}}: {{total}}, {{name}} ({{phone}})।',
      'নতুন অর্ডার #{{orderNo}} — {{total}}, {{name}}, {{phone}}। কনফার্ম করতে অ্যাডমিন প্যানেল খুলুন।',
    ),
  },
}

export const render = (body: string, vars: Record<string, string | number>) =>
  body.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ''))

export type SavedTemplate = {
  event: string
  channel: string
  locale: string
  body: string
  enabled: boolean
}

/** Owner's text for this event/channel/locale (SMS text also serves WhatsApp), else the default. */
export const templateFor = (
  saved: SavedTemplate[],
  event: MessageEvent,
  channel: Channel,
  locale: Locale,
) => {
  const key = channel === 'email' ? 'email' : 'sms'
  const own = saved.find((t) => t.event === event && t.channel === key && t.locale === locale)
  return own
    ? { body: own.body, enabled: own.enabled }
    : { body: defaultTemplates[event][locale][key === 'email' ? 'email' : 'short'], enabled: true }
}

export const MAX_ATTEMPTS = 8
/** 1, 2, 4, 8 … minutes, capped at 6 hours. */
export const backoffMs = (attempt: number) => Math.min(2 ** (attempt - 1) * 60_000, 6 * 3600_000)
