import { z } from 'zod'
import { currencyCodes, dateFormats, type CurrencyCode } from '@/modules/shared'

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
