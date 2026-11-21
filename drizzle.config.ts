import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/db/schema.ts',
  out: './src/infrastructure/db/migrations',
  casing: 'snake_case',
  // Used by `pnpm db:migrate` (VPS setup, Vercel build).
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
})
