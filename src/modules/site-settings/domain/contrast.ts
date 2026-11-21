const channel = (c: number) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  )
}

export const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** WCAG 2.2 AA: 4.5 for body text, 3 for large text / UI. */
export const passesAA = (fg: string, bg: string, large = false) =>
  contrastRatio(fg, bg) >= (large ? 3 : 4.5)

export const readableOn = (bg: string) =>
  contrastRatio('#FFFFFF', bg) >= contrastRatio('#111111', bg) ? '#FFFFFF' : '#111111'
