/** What shop search looks at for one product: its name, SKU and words such as category or brand. */
export type Searchable = { name: string; sku: string | null; keywords: string[] }

// Keep letters, digits and combining marks (Bangla vowel signs are marks), drop punctuation.
const words = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

/** Edit distance, giving up once it is certainly above `max`. */
const distance = (a: string, b: string, max: number) => {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++)
      row[j] = Math.min(
        prev[j]! + 1,
        row[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    if (Math.min(...row) > max) return max + 1
    prev = row
  }
  return prev[b.length]!
}

// Short words must be typed right; longer ones may have one slip (one more from 7 letters).
const slips = (w: string) => (w.length < 4 ? 0 : w.length < 7 ? 1 : 2)

/** How well one typed word fits one product word: 0 means not at all. */
const fit = (w: string, t: string) => {
  if (t === w) return 4
  if (t.startsWith(w)) return 3
  if (t.includes(w)) return 2
  const n = slips(w)
  // A slip anywhere in the word, or in the start of a longer word ("shrt" → "shirts").
  return n > 0 && Math.min(distance(w, t, n), distance(w, t.slice(0, w.length), n)) <= n ? 1 : 0
}

/**
 * Shop search the way shoppers type: words in any order, in the name, SKU, category or brand,
 * with a typo forgiven. Every typed word must fit; best fits first.
 */
export const searchProducts = <T extends Searchable>(items: T[], query: string): T[] => {
  const typed = words(query)
  if (typed.length === 0) return items
  return items
    .map((item, i) => {
      const own = words([item.name, item.sku ?? '', ...item.keywords].join(' '))
      let score = 0
      for (const w of typed) {
        const best = Math.max(0, ...own.map((t) => fit(w, t)))
        if (best === 0) return null
        score += best
      }
      return { item, i, score }
    })
    .filter((r) => r !== null)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r) => r.item)
}

/** When nothing matched: the query with each unknown word swapped for the nearest shop word. */
export const didYouMean = (items: Searchable[], query: string): string | null => {
  const vocabulary = [...new Set(items.flatMap((i) => words([i.name, ...i.keywords].join(' '))))]
  const typed = words(query)
  const fixed = typed.map((w) => {
    if (vocabulary.some((t) => t.startsWith(w))) return w
    let best = w
    let bestD = Math.max(2, slips(w)) + 1
    for (const t of vocabulary) {
      const d = distance(w, t, bestD - 1)
      if (d < bestD && w.length >= 3) [best, bestD] = [t, d]
    }
    return best
  })
  const suggestion = fixed.join(' ')
  return typed.length > 0 && suggestion !== typed.join(' ') ? suggestion : null
}
