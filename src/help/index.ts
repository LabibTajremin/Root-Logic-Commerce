import type { Locale } from '@/i18n'
import bn from './bn.json'
import en from './en.json'

const dicts: Record<Locale, Record<string, string>> = { en, bn }

/** Help text for a field id (spec §5.9); every admin field shows one via <HelpHint>. */
export const helpText = (locale: Locale, id: string) => dicts[locale][id] ?? dicts.en[id] ?? ''
