'use server'

import { act } from '../../act'

export type ImportRow = { line: number; action: string | null; errors: string[] }
export type ImportState = { rows?: ImportRow[]; ok?: boolean; applied?: boolean; error?: string }

// file/apply are inputs of the import form, so `get` never returns null.
export async function importProducts(_: ImportState, form: FormData): Promise<ImportState> {
  let out: ImportState = {}
  const state = await act('products.manage', async ({ catalog, media, store }) => {
    const text = await (form.get('file') as File).text()
    const apply = form.get('apply') === '1'
    const r = await catalog.importCsv(store.id, text, apply)
    // Drive links of newly created products become their photos.
    for (const { images } of r.rows)
      for (const link of images?.links ?? [])
        await media.attach(
          store.id,
          images!.productId,
          (await media.addDriveLink(store.id, link)).id,
        )
    out = {
      ok: r.ok,
      applied: r.ok && apply,
      rows: r.rows.map(({ line, action, errors }) => ({ line, action, errors })),
    }
  })
  return { ...state, ...out }
}
