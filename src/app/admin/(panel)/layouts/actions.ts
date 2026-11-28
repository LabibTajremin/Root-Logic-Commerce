'use server'

import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { DomainError } from '@/modules/shared'
import { PREVIEW_COOKIE, previewValue } from '@/server/preview'
import { currentSettings } from '@/server/request'
import { runtime } from '@/server/runtime'
import { isPresetId, layoutOf, presetLayout, withAllSections } from '@/sections/registry'
import { act, type ActionState } from '../act'

const presetOf = (form: FormData) => {
  const id = String(form.get('preset'))
  if (!isPresetId(id)) throw new DomainError('layouts.unknown')
  return id
}

/** Owner-only preview: a store-bound signed cookie, then the full site. */
export async function previewLayout(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ store }) => {
    const { config } = await runtime()
    ;(await cookies()).set(
      PREVIEW_COOKIE,
      previewValue(config.authSecret, store.id, presetOf(form)),
      {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      },
    )
    return '/'
  })
}

/** J3: apply a layout and decide what happens to the products. */
export async function switchLayout(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ settings, store, catalog }) => {
    const preset = presetOf(form)
    const choice = String(form.get('choice'))
    // Start fresh deletes the owner's products: the box and the typed word must both agree.
    if (choice === 'fresh' && !(form.get('sure') === 'on' && form.get('confirm') === 'FRESH'))
      throw new DomainError('layouts.confirm')
    const { version } = await currentSettings()
    await settings.saveLayout(store.id, presetLayout(preset), version)
    if (choice !== 'mine') await catalog.addDemoPack(store.id, preset)
    if (choice === 'demo') await catalog.hideMine(store.id)
    if (choice === 'fresh') await catalog.startFresh(store.id)
    ;(await cookies()).delete(PREVIEW_COOKIE)
    revalidateTag(`store:${store.id}`, 'max')
    return '/admin/layouts'
  })
}

export async function undoSwitch(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ catalog, store }) => {
    if (form.get('undo') === 'restore') await catalog.restoreMine(store.id)
    else await catalog.removeDemo(store.id)
    revalidateTag(`store:${store.id}`, 'max')
  })
}

type Ref = ReturnType<typeof withAllSections>[number]

/** Saves the builder's list (every section, in order) back as the home layout. */
const saveHome = (change: (all: Ref[]) => Ref[]) =>
  act('settings.manage', async ({ settings, store }) => {
    const { layout, version } = await currentSettings()
    const current = layoutOf(layout)
    await settings.saveLayout(
      store.id,
      { ...current, home: change(withAllSections(current)) },
      version,
    )
    revalidateTag(`store:${store.id}`, 'max')
  })

/** Show or hide one home section without changing the rest of the layout. */
export async function toggleSection(_: ActionState, form: FormData) {
  const id = String(form.get('section'))
  return saveHome((all) => all.map((r) => (r.sectionId === id ? { ...r, enabled: !r.enabled } : r)))
}

/** B5: drag order of the home sections. */
export async function reorderSections(ids: string[]) {
  return saveHome((all) => ids.flatMap((id) => all.filter((r) => r.sectionId === id)))
}

/** B5: a section's own settings (e.g. products per category row). */
export async function sectionSettings(_: ActionState, form: FormData) {
  const id = String(form.get('section'))
  const count = Number(form.get('count'))
  return saveHome((all) => all.map((r) => (r.sectionId === id ? { ...r, settings: { count } } : r)))
}
