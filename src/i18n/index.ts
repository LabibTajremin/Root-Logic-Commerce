import bn from './bn.json'
import en from './en.json'

export const locales = ['en', 'bn'] as const
export type Locale = (typeof locales)[number]
type Dict = Record<string, string>
const dicts: Record<Locale, Dict> = { en, bn }

export const isLocale = (v: unknown): v is Locale => v === 'en' || v === 'bn'

/** Missing Bangla falls back to English, then to the key itself — never a blank label. */
export const translate = (locale: Locale, key: string, vars?: Record<string, string | number>) => {
  const s = dicts[locale][key] ?? dicts.en[key] ?? key
  return vars ? s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? '')) : s
}
