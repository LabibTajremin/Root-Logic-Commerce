/**
 * Response headers for every route. The CSP allows only what the app uses: our own origin,
 * Google Analytics (when a store sets it) and the tap-to-load video players.
 * 'unsafe-inline' scripts: Next's streamed RSC payload and the GA snippet are inline.
 */
export const securityHeaders = (production: boolean) => {
  const csp = [
    "default-src 'self'",
    // The ad and analytics tools a shop can switch on (H1/H2/H3); a static header can't vary per shop.
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com https://www.clarity.ms https://scripts.clarity.ms",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.ytimg.com https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://*.clarity.ms",
    "font-src 'self'",
    "media-src 'self'",
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://analytics.tiktok.com https://*.clarity.ms",
    // 'self': the design editor previews the storefront in an iframe.
    "frame-src 'self' https://www.youtube-nocookie.com https://www.facebook.com https://www.instagram.com https://www.tiktok.com",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')
  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    // C5: checkout may ask for the shopper's location (own pages only, never embeds).
    {
      key: 'Permissions-Policy',
      // E4: the parcel scanner reads barcodes with the camera on our own pages.
      value: 'camera=(self), microphone=(), geolocation=(self), payment=()',
    },
    ...(production
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
      : []),
  ]
}
