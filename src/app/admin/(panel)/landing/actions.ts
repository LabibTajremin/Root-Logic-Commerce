'use server'

import { moveBlock, type BlockKind } from '@/modules/landing'
import { toMinor } from '@/modules/shared'
import { currentSettings } from '@/server/request'
import { act, type ActionState } from '../act'

// Every key read is an input of the landing forms.
const str = (f: FormData, k: string) => String(f.get(k) ?? '')
const lines = (v: string) =>
  v
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

export async function createLandingPage(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ landing, store, locale }) => {
    const id = await landing.create(
      store.id,
      {
        title: str(form, 'title'),
        slug: str(form, 'slug'),
        productId: str(form, 'productId'),
        design: str(form, 'design') as 'bold',
      },
      locale,
    )
    return `/admin/landing/${id}`
  })
}

/** Saves the whole page and stays on it; an Up/Down button saves too, then moves its block. */
export async function saveLanding(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ landing, store }) => {
    const id = str(form, 'id')
    const count = Number(form.get('count'))
    let blocks = Array.from({ length: count }, (_, i) => {
      const k = (x: string) => str(form, `b${i}.${x}`)
      return {
        // Unknown kinds are refused by the page schema on save.
        kind: k('kind') as BlockKind,
        on: form.get(`b${i}.on`) === 'on',
        title: k('title'),
        text: k('text'),
        items: lines(k('items')),
        url: k('url') || null,
        endsAt: k('endsAt') || null,
        packs: [0, 1, 2, 3].flatMap((j) => {
          const qty = Number(k(`qty${j}`))
          return qty > 0 ? [{ qty, price: toMinor(Number(k(`price${j}`))) }] : []
        }),
      }
    })
    const move = str(form, 'move')
    if (move) {
      const [i, dir] = move.split(':').map(Number)
      blocks = moveBlock(blocks, i!, dir as -1 | 1)
    }
    await landing.save(store.id, id, {
      title: str(form, 'title'),
      slug: str(form, 'slug'),
      productId: str(form, 'productId'),
      design: str(form, 'design'),
      siteChrome: form.get('siteChrome') === 'on',
      hidden: form.get('hidden') === 'on',
      blocks,
    })
  })
}

export async function toggleLanding(_: ActionState, form: FormData) {
  return act('settings.manage', ({ landing, store }) =>
    landing.setHidden(store.id, str(form, 'id'), form.get('hidden') === 'true'),
  )
}

export async function copyLanding(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ landing, store }) => {
    return `/admin/landing/${await landing.copy(store.id, str(form, 'id'))}`
  })
}

// The required "Yes, delete" tick keeps a stray tap from removing a page.
export async function deleteLanding(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ landing, store }) => {
    await landing.remove(store.id, str(form, 'id'))
    return '/admin/landing'
  })
}

export async function saveLandingPrefix(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ settings, store }) => {
    const { business, version } = await currentSettings()
    await settings.saveBusiness(
      store.id,
      { ...business, landing: { prefix: str(form, 'prefix') } },
      version,
    )
  })
}
