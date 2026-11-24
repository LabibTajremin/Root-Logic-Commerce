import { z } from 'zod'
import { currencyCodes, dateFormats, type CurrencyCode } from '@/modules/shared'

/** B2: Add to cart, Order now (straight to checkout), WhatsApp order, Call to order. */
export const orderPathIds = ['cart', 'now', 'whatsapp', 'call'] as const
export type OrderPathId = (typeof orderPathIds)[number]

export const businessSchema = z.object({
  contact: z
    .object({
      phone: z.string().max(20).default(''),
      whatsapp: z.string().max(20).default(''),
      // Facebook page username for m.me links (help bubble).
      messenger: z
        .string()
        .regex(/^[\w.]*$/)
        .max(60)
        .default(''),
      address: z.string().max(200).default(''),
      mapUrl: z.url().or(z.literal('')).default(''),
    })
    .prefault({}),
  deliveryZones: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        label: z.string().min(1).max(60),
        charge: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .default([
      { id: 'inside-dhaka', label: 'Inside Dhaka', charge: 6000 },
      { id: 'outside-dhaka', label: 'Outside Dhaka', charge: 13000 },
    ]),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  // A4: tell shoppers "Only N left" once a product reaches its low-stock threshold.
  showStockLeft: z.boolean().default(true),
  // B6 "Verified business": registration numbers shoppers can check; empty ones are hidden.
  trust: z
    .object({
      tradeLicence: z.string().trim().max(60).default(''),
      tin: z.string().trim().max(60).default(''),
      bin: z.string().trim().max(60).default(''),
      dbid: z.string().trim().max(60).default(''),
      warranty: z.string().trim().max(200).default(''),
    })
    .prefault({}),
  // C3: delivery is free above a subtotal, in some zones, or with some products.
  freeShipping: z
    .object({
      minSubtotal: z.number().int().positive().nullable().default(null),
      zoneIds: z.array(z.string()).max(20).default([]),
      productIds: z.array(z.uuid()).max(50).default([]),
    })
    .prefault({}),
  // C7: order value bounds (minor units, null = none).
  orderLimits: z
    .object({
      minOrder: z.number().int().positive().nullable().default(null),
      maxOrder: z.number().int().positive().nullable().default(null),
    })
    .prefault({}),
  // C4/C17: how the address is typed, and which delivery zone each district means.
  address: z
    .object({
      mode: z.enum(['text', 'picker']).default('text'),
      districtZones: z
        .record(z.string().max(40), z.string().max(60))
        .default({ Dhaka: 'inside-dhaka' }),
      otherZone: z.string().max(60).default('outside-dhaka'),
    })
    .prefault({}),
  // B2: the product page's ways to order, in the owner's order, and the mobile buy bar.
  orderPaths: z
    .object({
      buttons: z
        .array(z.object({ id: z.enum(orderPathIds), on: z.boolean() }))
        .max(orderPathIds.length)
        .default(orderPathIds.map((id) => ({ id, on: id === 'cart' || id === 'now' }))),
      stickyBar: z.boolean().default(false),
    })
    .prefault({}),
  // C10: thank-you page; empty texts use the default wording.
  thankYou: z
    .object({
      heading: z.string().trim().max(120).default(''),
      sub: z.string().trim().max(300).default(''),
      message: z.string().trim().max(1000).default(''),
      accent: z
        .string()
        .regex(/^(#[0-9a-fA-F]{6})?$/)
        .default(''),
      home: z.boolean().default(true),
      invoice: z.boolean().default(true),
      whatsapp: z.boolean().default(true),
    })
    .prefault({}),
  // D1/D4: order guard (0 = no per-window limit; duplicates are flagged, blocked only if asked).
  fraud: z
    .object({
      perWindow: z.number().int().min(0).max(100).default(0),
      windowHours: z.number().int().min(1).max(720).default(24),
      duplicateHours: z.number().int().min(1).max(720).default(24),
      blockDuplicates: z.boolean().default(false),
    })
    .prefault({}),
  // C6: which extra fields checkout asks for.
  checkout: z
    .object({
      email: z.enum(['off', 'optional', 'required']).default('optional'),
      altPhone: z.boolean().default(true),
      preferredTime: z.boolean().default(false),
      giftWrap: z.boolean().default(false),
    })
    .prefault({}),
  // B12 "Shop by budget": owner-named price caps (minor units), cheapest first.
  budgetBands: z
    .array(z.object({ label: z.string().trim().min(1).max(40), max: z.number().int().positive() }))
    .max(8)
    .default([]),
  banglaDigits: z.boolean().default(false),
  currency: z.enum(currencyCodes as [CurrencyCode, ...CurrencyCode[]]).default('BDT'),
  dateFormat: z.enum(dateFormats).default('d MMM yyyy'),
  // Channel settings; password/apiKey/token are stored sealed (AES-GCM, SETTINGS_KEY).
  messages: z
    .object({
      ownerPhone: z.string().max(20).default(''),
      ownerEmail: z.email().or(z.literal('')).default(''),
      email: z
        .object({
          enabled: z.boolean().default(false),
          host: z.string().max(200).default(''),
          port: z.number().int().min(1).max(65535).default(587),
          user: z.string().max(200).default(''),
          password: z.string().max(2000).default(''),
          from: z.string().max(200).default(''),
        })
        .prefault({}),
      sms: z
        .object({
          enabled: z.boolean().default(false),
          // Gateway URL with {{to}}, {{text}}, {{sender}} and {{apiKey}} placeholders (BD gateways differ).
          url: z.url().startsWith('https://').or(z.literal('')).default(''),
          apiKey: z.string().max(2000).default(''),
          sender: z.string().max(40).default(''),
        })
        .prefault({}),
      whatsapp: z
        .object({
          enabled: z.boolean().default(false),
          phoneNumberId: z.string().regex(/^\d*$/).max(30).default(''),
          token: z.string().max(4000).default(''),
        })
        .prefault({}),
    })
    .prefault({}),
  otp: z
    .object({ email: z.boolean().default(false), sms: z.boolean().default(false) })
    .prefault({}),
  seo: z
    .object({
      titleTemplate: z.string().max(70).includes('%s').default('%s'),
      metaDescription: z.string().max(170).default(''),
    })
    .prefault({}),
  // Shop language when the visitor has not picked one (null = the deploy's store.locale).
  language: z
    .object({
      default: z.enum(['en', 'bn']).nullable().default(null),
      switcher: z.boolean().default(true),
    })
    .prefault({}),
  // Owner wording per language for storefront strings (J4); keys are i18n `shop.*` keys.
  texts: z
    .object({
      en: z
        .record(z.string().regex(/^shop\.[\w.]+$/), z.string().trim().min(1).max(300))
        .default({}),
      bn: z
        .record(z.string().regex(/^shop\.[\w.]+$/), z.string().trim().min(1).max(300))
        .default({}),
    })
    .prefault({}),
  ga4MeasurementId: z
    .string()
    .regex(/^G-[A-Z0-9]{4,}$/)
    .nullable()
    .default(null),
})
export type Business = z.infer<typeof businessSchema>

/** B12: "Under ৳500: 500" per line → bands; lines without a valid price are skipped. */
/** B2: the buttons a product shows, in order; WhatsApp / Call only with the shop's number. */
export const orderButtons = (b: Business) => {
  const has = { cart: true, now: true, whatsapp: !!b.contact.whatsapp, call: !!b.contact.phone }
  return b.orderPaths.buttons.filter((x) => x.on && has[x.id]).map((x) => x.id)
}
/** B2: the mobile buy bar shows on plain, in-stock products when the owner turns it on. */
export const stickyBuyBar = (b: Business, p: { variants: number; inStock: boolean }) =>
  b.orderPaths.stickyBar && p.variants === 0 && p.inStock

/** An owner text, or the default wording when it is left empty. */
export const textOr = (custom: string, fallback: string) => custom || fallback

export const bandsFromText = (text: string) =>
  text
    .split('\n')
    .flatMap((line) => {
      const i = line.lastIndexOf(':')
      const label = line.slice(0, i).trim()
      const max = Math.round(Number(line.slice(i + 1).trim()) * 100)
      return i > 0 && label && max > 0 ? [{ label, max }] : []
    })
    .sort((a, b) => a.max - b.max)

export const bandsToText = (bands: { label: string; max: number }[]) =>
  bands.map((b) => `${b.label}: ${b.max / 100}`).join('\n')
