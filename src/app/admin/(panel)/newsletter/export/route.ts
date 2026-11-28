import { adminContext } from '../../context'

/** B13: the sign-ups as a spreadsheet. */
export const GET = async () => {
  const { allowed, newsletter, store } = await adminContext('settings.manage')
  if (!allowed) return new Response(null, { status: 403 })
  return new Response(await newsletter.csv(store.id), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="newsletter.csv"',
    },
  })
}
