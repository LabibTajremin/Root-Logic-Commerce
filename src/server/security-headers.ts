/**
 * Response headers for every route. The CSP allows only what the app uses: our own origin,
 * Google Analytics (when a store sets it) and the tap-to-load video players.
 * 'unsafe-inline' scripts: Next's streamed RSC payload and the GA snippet are inline.
 */
export const securityHeaders = (production: boolean) => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.ytimg.com https://www.google-analytics.com https://www.googletagmanager.com",
    "font-src 'self'",
    "media-src 'self'",
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
    // 'self': the design editor previews the storefront in an iframe.
    "frame-src 'self' https://www.youtube-nocookie.com https://www.facebook.com https://www.instagram.com",
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
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    ...(production
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
      : []),
  ]
}
