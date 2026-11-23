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

export async function applyLayout(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ settings, store }) => {
    const { version } = await currentSettings()
    await settings.saveLayout(store.id, presetLayout(presetOf(form)), version)
    ;(await cookies()).delete(PREVIEW_COOKIE)
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
