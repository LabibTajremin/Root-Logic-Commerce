import { z } from 'zod'

export const businessSchema = z.object({
  contact: z
    .object({
      phone: z.string().max(20).default(''),
      whatsapp: z.string().max(20).default(''),
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
  otp: z
    .object({ email: z.boolean().default(false), sms: z.boolean().default(false) })
    .prefault({}),
  seo: z
    .object({
      titleTemplate: z.string().max(70).includes('%s').default('%s'),
      metaDescription: z.string().max(170).default(''),
    })
    .prefault({}),
  ga4MeasurementId: z
    .string()
    .regex(/^G-[A-Z0-9]{4,}$/)
    .nullable()
    .default(null),
})
export type Business = z.infer<typeof businessSchema>
