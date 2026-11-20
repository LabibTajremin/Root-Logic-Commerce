import { translate } from '@/i18n'
import { isAllowed, type Permission } from '@/modules/access'
import { runtime } from '@/server/runtime'
import { currentActor, currentLocale, currentStore } from '@/server/request'

/** Everything an admin page/action needs; `allowed` tells pages whether to show owner-only UI. */
export const adminContext = async (permission: Permission) => {
  const [store, actor, locale, rt] = await Promise.all([
    currentStore(),
    currentActor(),
    currentLocale(),
    runtime(),
  ])
  return {
    store,
    actor,
    locale,
    allowed: actor !== null && isAllowed(actor, permission, store.id),
    t: (k: string, v?: Record<string, string | number>) => translate(locale, k, v),
    ...rt.container,
  }
}
