'use server'

import { randomUUID } from 'node:crypto'
import type { Popup } from '@/modules/promotions'
import { currentSettings } from '@/server/request'
import { act, type ActionState } from '../act'
import type { adminContext } from '../context'

// Every key read is an input of the popup form.
const str = (f: FormData, k: string) => String(f.get(k)).trim()

type Ctx = Awaited<ReturnType<typeof adminContext>>
const savePopups = async ({ settings, store }: Ctx, change: (popups: Popup[]) => object[]) => {
  const { business, version } = await currentSettings()
  await settings.saveBusiness(store.id, { ...business, popups: change(business.popups) }, version)
}

/** B8: a new popup — what it says, where, when and how often. */
export async function addPopup(_: ActionState, form: FormData) {
  return act('settings.manage', (ctx) =>
    savePopups(ctx, (popups) => [
      ...popups,
      {
        id: randomUUID(),
        kind: str(form, 'kind'),
        title: str(form, 'title'),
        text: str(form, 'text'),
        productId: str(form, 'productId') || null,
        cta: str(form, 'cta'),
        href: str(form, 'href'),
        pages: str(form, 'pages'),
        trigger: str(form, 'trigger'),
        delay: Number(str(form, 'delay')),
        scroll: Number(str(form, 'scroll')),
        everyDays: Number(str(form, 'everyDays')),
        device: str(form, 'device'),
      },
    ]),
  )
}

export async function togglePopup(_: ActionState, form: FormData) {
  return act('settings.manage', (ctx) =>
    savePopups(ctx, (popups) =>
      popups.map((p) => (p.id === str(form, 'id') ? { ...p, on: !p.on } : p)),
    ),
  )
}

export async function removePopup(_: ActionState, form: FormData) {
  return act('settings.manage', (ctx) =>
    savePopups(ctx, (popups) => popups.filter((p) => p.id !== str(form, 'id'))),
  )
}
