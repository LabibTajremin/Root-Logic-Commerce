import { z } from 'zod'

const cell = z.string().max(40)

/** A5: a reusable size table; the first row is the header. */
export const sizeChartInput = z.object({
  name: z.string().trim().min(1).max(80),
  rows: z.array(z.array(cell).min(1).max(10)).min(2).max(30),
})
export type SizeChartInput = z.input<typeof sizeChartInput>

/** The admin types one row per line, cells split by "|". */
export const chartFromText = (text: string): string[][] => {
  const rows = text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => l.split('|').map((c) => c.trim()))
  const width = rows[0]?.length ?? 0
  return rows.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ''))
}

export const chartToText = (rows: string[][]) => rows.map((r) => r.join(' | ')).join('\n')
