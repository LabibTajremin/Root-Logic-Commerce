'use server'

import { revalidateTag } from 'next/cache'
import type { BrandImageSlot } from '@/modules/site-settings'
import { currentSettings } from '@/server/request'
import { act, type ActionState } from '../act'

type Ctx = Parameters<Parameters<typeof act>[1]>[0]

// slot/file/link are inputs of the logo forms, so `get` never returns null.
const slotOf = (f: FormData) => f.get('slot') as BrandImageSlot

const setSlot = async (
  { settings, store }: Ctx,
  slot: BrandImageSlot,
  ref: { kind: 'upload'; id: string } | undefined,
) => {
  const { design, version } = await currentSettings()
  await settings.saveDesign(
    store.id,
    { ...design, brand: { ...design.brand, [slot]: ref } },
    version,
  )
  revalidateTag(`store:${store.id}`, 'max')
}

export async function uploadBrandImage(_: ActionState, form: FormData) {
  return act('settings.manage', async (ctx) => {
    const slot = slotOf(form)
    const bytes = new Uint8Array(await (form.get('file') as File).arrayBuffer())
    // The favicon has its own (smaller) size limit; every logo shares the logo limit.
    const m = await ctx.media.upload(ctx.store.id, slot === 'favicon' ? 'favicon' : 'logo', bytes)
    await setSlot(ctx, slot, { kind: 'upload', id: m.id })
  })
}

export async function addBrandDriveImage(_: ActionState, form: FormData) {
  return act('settings.manage', async (ctx) => {
    const m = await ctx.media.addDriveLink(ctx.store.id, form.get('link') as string)
    await setSlot(ctx, slotOf(form), { kind: 'upload', id: m.id })
  })
}

export async function removeBrandImage(_: ActionState, form: FormData) {
  return act('settings.manage', (ctx) => setSlot(ctx, slotOf(form), undefined))
}
