import type { DrivePort } from '@/modules/media'

/** Public ("anyone with the link") Drive images, resized by Google's thumbnail endpoint. */
export const createDrive = (fetcher: typeof fetch = fetch): DrivePort => ({
  async fetch(fileId, width) {
    let res: Response
    try {
      res = await fetcher(
        `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`,
        { redirect: 'follow' },
      )
    } catch {
      return null // Drive unreachable: the page shows the placeholder colour instead.
    }
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.startsWith('image/')) return null
    return { data: new Uint8Array(await res.arrayBuffer()), type }
  },
})
