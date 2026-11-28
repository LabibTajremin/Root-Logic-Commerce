'use server'

import { randomUUID } from 'node:crypto'
import { toMinor } from '@/modules/shared'
import { currentSettings } from '@/server/request'
import { act, type ActionState } from './act'
import type { adminContext } from './context'

type Ctx = Awaited<ReturnType<typeof adminContext>>
// Every key read is an input of the combo / flash sale forms.
const str = (f: FormData, k: string) => String(f.get(k)).trim()
const ROWS = [0, 1, 2, 3, 4, 5, 6, 7]

const save = async (
  { settings, store }: Ctx,
  change: (b: Awaited<ReturnType<typeof currentSettings>>['business']) => object,
) => {
  const { business, version } = await currentSettings()
  await settings.saveBusiness(store.id, { ...business, ...change(business) }, version)
}

/** A9: a new combo from up to four product rows. */
export async function addCombo(_: ActionState, form: FormData) {
  return act('products.manage', (ctx) =>
    save(ctx, (b) => ({
      combos: [
        ...b.combos,
        {
          id: randomUUID(),
          name: str(form, 'name'),
          slug: str(form, 'slug'),
          on: true,
          price: toMinor(Number(str(form, 'price'))),
          items: [0, 1, 2, 3].flatMap((i) =>
            str(form, `product${i}`)
              ? [{ productId: str(form, `product${i}`), qty: Number(str(form, `qty${i}`)) }]
              : [],
          ),
        },
      ],
    })),
  )
}

export async function toggleCombo(_: ActionState, form: FormData) {
  return act('products.manage', (ctx) =>
    save(ctx, (b) => ({
      combos: b.combos.map((c) => (c.id === str(form, 'id') ? { ...c, on: !c.on } : c)),
    })),
  )
}

export async function removeCombo(_: ActionState, form: FormData) {
  return act('products.manage', (ctx) =>
    save(ctx, (b) => ({ combos: b.combos.filter((c) => c.id !== str(form, 'id')) })),
  )
}

// Bangladesh time (UTC+6, no daylight saving): what the owner types is what shoppers see.
const dhaka = (v: string) => `${v}:00+06:00`

/** B11: the one flash sale — window, cap and up to eight products (price or % off each). */
export async function saveFlashSale(_: ActionState, form: FormData) {
  return act('products.manage', (ctx) =>
    save(ctx, () => ({
      flashSale: {
        on: form.get('on') === 'on',
        name: str(form, 'name'),
        startsAt: dhaka(str(form, 'startsAt')),
        endsAt: dhaka(str(form, 'endsAt')),
        cap: str(form, 'cap') ? Number(str(form, 'cap')) : null,
        items: ROWS.flatMap((i) => {
          const productId = str(form, `product${i}`)
          if (!productId) return []
          const price = str(form, `price${i}`)
          return [
            {
              productId,
              price: price ? toMinor(Number(price)) : null,
              percent: str(form, `percent${i}`) ? Number(str(form, `percent${i}`)) : null,
            },
          ]
        }),
      },
    })),
  )
}

export async function endFlashSale() {
  return act('products.manage', (ctx) => save(ctx, () => ({ flashSale: null })))
}
