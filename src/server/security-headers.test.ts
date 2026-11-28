import { describe, expect, it } from 'vitest'
import { securityHeaders } from './security-headers'

describe('security headers', () => {
  it('locks down sources and adds HSTS only in production', () => {
    const dev = Object.fromEntries(securityHeaders(false).map((h) => [h.key, h.value]))
    expect(dev['Content-Security-Policy']).toContain("frame-ancestors 'self'")
    expect(dev['Content-Security-Policy']).toContain("object-src 'none'")
    expect(dev['X-Content-Type-Options']).toBe('nosniff')
    // H1/H2/H3 tags may load; E4 scanning needs the shop's own camera.
    expect(dev['Content-Security-Policy']).toContain('https://connect.facebook.net')
    expect(dev['Permissions-Policy']).toContain('camera=(self)')
    expect(dev['Strict-Transport-Security']).toBeUndefined()
    expect(securityHeaders(true).map((h) => h.key)).toContain('Strict-Transport-Security')
  })
})
