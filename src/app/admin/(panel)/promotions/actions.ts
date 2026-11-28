'use server'

import type { BannerKind } from '@/modules/promotions'
import { DomainError } from '@/modules/shared'
import { act, type ActionState } from '../act'

// Every key read here is an input of the banner form for that kind.
const text = (f: FormData, k: string) => (f.get(k) as string).trim()
const files = (f: FormData, k: string) => (f.getAll(k) as File[]).filter((x) => x.size > 0)
const bytes = async (file: File) => new Uint8Array(await file.arrayBuffer())

export async function addBanner(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ promotions, media, plans, store }) => {
    const image = async (file: File) =>
      (await media.upload(store.id, 'banner', await bytes(file))).id
    const link = () => ({ message: text(form, 'message'), cta: text(form, 'cta') })
    const build: Record<BannerKind, () => Promise<unknown>> = {
      products: async () => ({
        kind: 'products',
        productIds: form.getAll('productIds'),
        ...link(),
      }),
      images: async () => ({
        kind: 'images',
        mediaIds: await Promise.all(files(form, 'images').map(image)),
        ...link(),
        href: text(form, 'href'),
      }),
      poster: async () => {
        const [img] = files(form, 'image')
        return {
          kind: 'poster',
          background: text(form, 'background'),
          imageId: img ? await image(img) : null,
          headline: text(form, 'headline'),
          sub: text(form, 'sub'),
          cta: text(form, 'cta'),
          href: text(form, 'href'),
        }
      },
      video: async () => {
        if (!(await plans.has(store.id, 'videoUploads'))) throw new DomainError('plan.locked')
        const [file] = files(form, 'video')
        const v = await media.uploadVideo(store.id, await bytes(file!))
        return { kind: 'video', mediaId: v.id, caption: text(form, 'caption') }
      },
      embed: async () => ({
        kind: 'embed',
        url: text(form, 'url'),
        caption: text(form, 'caption'),
      }),
    }
    await promotions.create(store.id, await build[text(form, 'kind') as BannerKind]())
  })
}

export async function toggleBanner(_: ActionState, form: FormData) {
  return act('settings.manage', ({ promotions, store }) =>
    promotions.setActive(store.id, text(form, 'id'), form.get('active') === 'true'),
  )
}

export async function removeBanner(_: ActionState, form: FormData) {
  return act('settings.manage', ({ promotions, store }) =>
    promotions.remove(store.id, text(form, 'id')),
  )
}

export async function reorderBanners(ids: string[]) {
  return act('settings.manage', ({ promotions, store }) => promotions.reorder(store.id, ids))
}
