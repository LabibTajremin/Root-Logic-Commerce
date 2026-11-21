import type { MetadataRoute } from 'next'
import { origin } from './(storefront)/origin'

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/checkout', '/track', '/order/'] },
    sitemap: `${await origin()}/sitemap.xml`,
  }
}
