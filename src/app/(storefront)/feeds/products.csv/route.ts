import { feedCsv } from '@/modules/catalog'
import { shopFeed } from '../shop-feed'

/** H10: the same feed as a spreadsheet. */
export const GET = async () => {
  const { items } = await shopFeed()
  return new Response(feedCsv(items), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } })
}
