import bn from './bn.json'
import en from './en.json'

export const locales = ['en', 'bn'] as const
export type Locale = (typeof locales)[number]
type Dict = Record<string, string>
const dicts: Record<Locale, Dict> = { en, bn }

export const isLocale = (v: unknown): v is Locale => v === 'en' || v === 'bn'

/** Storefront strings the owner may reword per language (J4). */
export const storefrontKeys = Object.keys(en).filter((k) => k.startsWith('shop.'))

/**
 * The owner's own wording wins; missing Bangla falls back to English, then to the key
 * itself — never a blank label.
 */
export const translate = (
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
  own?: Readonly<Dict>,
) => {
  const s = own?.[key] ?? dicts[locale][key] ?? dicts.en[key] ?? key
  return vars ? s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? '')) : s
}
