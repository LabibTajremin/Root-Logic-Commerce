const BN: Record<string, string> = {
  '\u0985': 'o',
  '\u0986': 'a',
  '\u0987': 'i',
  '\u0988': 'i',
  '\u0989': 'u',
  '\u098A': 'u',
  '\u098B': 'ri',
  '\u098F': 'e',
  '\u0990': 'oi',
  '\u0993': 'o',
  '\u0994': 'ou',
  '\u0995': 'k',
  '\u0996': 'kh',
  '\u0997': 'g',
  '\u0998': 'gh',
  '\u0999': 'ng',
  '\u099A': 'ch',
  '\u099B': 'chh',
  '\u099C': 'j',
  '\u099D': 'jh',
  '\u099E': 'n',
  '\u099F': 't',
  '\u09A0': 'th',
  '\u09A1': 'd',
  '\u09A2': 'dh',
  '\u09A3': 'n',
  '\u09A4': 't',
  '\u09A5': 'th',
  '\u09A6': 'd',
  '\u09A7': 'dh',
  '\u09A8': 'n',
  '\u09AA': 'p',
  '\u09AB': 'f',
  '\u09AC': 'b',
  '\u09AD': 'bh',
  '\u09AE': 'm',
  '\u09AF': 'j',
  '\u09B0': 'r',
  '\u09B2': 'l',
  '\u09B6': 'sh',
  '\u09B7': 'sh',
  '\u09B8': 's',
  '\u09B9': 'h',
  '\u09DC': 'r',
  '\u09DD': 'rh',
  '\u09DF': 'y',
  '\u09CE': 't',
  '\u0982': 'ng',
  '\u0983': 'h',
  '\u0981': '',
  '\u09BC': '',
  '\u09BE': 'a',
  '\u09BF': 'i',
  '\u09C0': 'i',
  '\u09C1': 'u',
  '\u09C2': 'u',
  '\u09C3': 'ri',
  '\u09C7': 'e',
  '\u09C8': 'oi',
  '\u09CB': 'o',
  '\u09CC': 'ou',
  '\u09CD': '',
  '\u09E6': '0',
  '\u09E7': '1',
  '\u09E8': '2',
  '\u09E9': '3',
  '\u09EA': '4',
  '\u09EB': '5',
  '\u09EC': '6',
  '\u09ED': '7',
  '\u09EE': '8',
  '\u09EF': '9',
}
const isConsonant = (c: string | undefined) => c !== undefined && /[ক-হড়-য়]/.test(c)

// Bangla names must give readable URLs (legacy build turned them all into "item").
const transliterate = (s: string) =>
  [
    ...s
      .normalize('NFC')
      // NFC keeps ড়/ঢ়/য় decomposed; fold them to the single code points the map uses
      .replace(/\u09A1\u09BC/g, '\u09DC')
      .replace(/\u09A2\u09BC/g, '\u09DD')
      .replace(/\u09AF\u09BC/g, '\u09DF'),
  ]
    .map((c, i, a) => {
      const t = BN[c]
      if (t === undefined) return c
      // inherent "o" between two consonants, e.g. আতর → ator
      return isConsonant(c) && isConsonant(a[i + 1]) ? t + 'o' : t
    })
    .join('')

export const slugify = (name: string) =>
  transliterate(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

export const uniqueSlug = async (
  name: string,
  taken: (slug: string) => Promise<boolean>,
  shortId: () => string,
) => {
  const base = slugify(name) || `p-${shortId()}`
  let slug = base
  for (let n = 2; await taken(slug); n++) slug = `${base}-${n}`
  return slug
}
