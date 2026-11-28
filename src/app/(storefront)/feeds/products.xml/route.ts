import { feedXml } from '@/modules/catalog'
import { shopFeed } from '../shop-feed'

/** H10: Google Merchant / Meta catalog feed (scheduled fetch by the ad platform). */
export const GET = async () => {
  const { items, shop } = await shopFeed()
  return new Response(feedXml(items, shop), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
