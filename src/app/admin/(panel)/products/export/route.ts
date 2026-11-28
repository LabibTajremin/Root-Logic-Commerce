import { adminContext } from '../../context'

/** A15: the whole catalog as a spreadsheet (products, then their variants). */
export const GET = async () => {
  const { allowed, catalog, store } = await adminContext('products.manage')
  if (!allowed) return new Response(null, { status: 403 })
  return new Response(await catalog.exportCsv(store.id), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="products.csv"',
    },
  })
}
