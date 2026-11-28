'use server'

import { act, type ActionState } from '../act'

// Every key read is an input of the reel form.
const str = (f: FormData, k: string) => String(f.get(k)).trim()
const file = (f: FormData, k: string) => {
  const x = f.get(k) as File
  return x.size > 0 ? x : null
}
const bytes = async (x: File) => new Uint8Array(await x.arrayBuffer())

/** B4: an uploaded video or a link, with an optional cover (needed for FB/IG/TikTok links). */
export async function addReel(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ reels, media, store }) => {
    const video = file(form, 'video')
    const cover = file(form, 'cover')
    await reels.add(store.id, {
      videoId: video && (await media.uploadVideo(store.id, await bytes(video))).id,
      url: str(form, 'url') || null,
      coverId: cover && (await media.upload(store.id, 'banner', await bytes(cover))).id,
      caption: str(form, 'caption'),
      productIds: [0, 1, 2, 3].map((i) => str(form, `product${i}`)).filter(Boolean),
    })
  })
}

export async function moveReel(_: ActionState, form: FormData) {
  return act('settings.manage', ({ reels, store }) =>
    reels.move(store.id, str(form, 'id'), Number(str(form, 'dir')) as -1 | 1),
  )
}

export async function removeReel(_: ActionState, form: FormData) {
  return act('settings.manage', ({ reels, store }) => reels.remove(store.id, str(form, 'id')))
}
