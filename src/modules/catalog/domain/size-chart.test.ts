import { describe, expect, it } from 'vitest'
import { chartFromText, chartToText, sizeChartInput } from './size-chart'

describe('size charts (A5)', () => {
  it('reads "a | b | c" rows, pads short rows to the header and drops blank lines', () => {
    const rows = chartFromText('Size | Chest | Length\n\nM | 38 | 28\n L|40 \n')
    expect(rows).toEqual([
      ['Size', 'Chest', 'Length'],
      ['M', '38', '28'],
      ['L', '40', ''],
    ])
    expect(chartFromText(chartToText(rows))).toEqual(rows)
    expect(chartFromText('')).toEqual([])
  })

  it('needs a name, a header and at least one row', () => {
    const rows = chartFromText('Size | Chest\nM | 38')
    expect(sizeChartInput.parse({ name: ' Kurta ', rows })).toEqual({ name: 'Kurta', rows })
    expect(sizeChartInput.safeParse({ name: 'Kurta', rows: rows.slice(0, 1) }).success).toBe(false)
    expect(sizeChartInput.safeParse({ name: '', rows }).success).toBe(false)
  })
})
