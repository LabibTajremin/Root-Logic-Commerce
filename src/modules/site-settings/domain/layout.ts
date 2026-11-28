import { z } from 'zod'

const slug = z.string().regex(/^[a-z0-9-]+$/)

// Structure only: each section's own settings are validated by the sections registry.
export const sectionRefSchema = z.object({
  sectionId: slug,
  enabled: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
})

export const layoutSchema = z.object({
  preset: slug,
  home: z.array(sectionRefSchema).max(40),
})

export type SectionRef = z.infer<typeof sectionRefSchema>
export type Layout = z.infer<typeof layoutSchema>
