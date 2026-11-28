import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import type { Db } from '../db/client'
import { accounts, sessions, users, verifications } from '../db/schema'

export const createAuth = (db: Db, secret: string) =>
  betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true,
      schema: { users, sessions, accounts, verifications },
    }),
    secret,
    // One process serves many store domains (resolved from store_domains), so the auth
    // origin is the request's own host; CSRF checks then accept same-origin requests only.
    baseURL: { allowedHosts: ['*'], protocol: 'auto' },
    // Always deployed behind Caddy (VPS) or Vercel, which set the forwarded headers.
    advanced: { trustedProxyHeaders: true },
    // Accounts are created by the store bootstrap / owner invites, never by public sign-up.
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
    user: {
      additionalFields: {
        role: { type: 'string', input: false },
        storeId: { type: 'string', input: false, required: false },
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: { '/sign-in/email': { window: 900, max: 5 } },
    },
    plugins: [nextCookies()],
  })

export type Auth = ReturnType<typeof createAuth>
