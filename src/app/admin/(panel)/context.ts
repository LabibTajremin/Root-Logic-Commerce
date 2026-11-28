import { translate } from '@/i18n'
import { isAllowed, type Permission } from '@/modules/access'
import { formatMoney } from '@/modules/shared'
import { runtime } from '@/server/runtime'
import { currentActor, currentLocale, currentSettings, currentStore } from '@/server/request'

/** Everything an admin page/action needs; `allowed` tells pages whether to show owner-only UI. */
export const adminContext = async (permission: Permission) => {
  const [store, actor, locale, rt, { business }] = await Promise.all([
    currentStore(),
    currentActor(),
    currentLocale(),
    runtime(),
    currentSettings(),
  ])
  return {
    store,
    actor,
    locale,
    allowed: actor !== null && isAllowed(actor, permission, store.id),
    t: (k: string, v?: Record<string, string | number>) => translate(locale, k, v),
    /** Prices in the shop's currency (admin keeps Latin digits). */
    money: (minor: number) => formatMoney(minor, { currency: business.currency }),
    ...rt.container,
  }
}
