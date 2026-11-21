import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    // Integration tests boot a real Postgres (PGlite/WASM) and run migrations per file; CI runners are slower.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      include: ['src/**'],
      provider: 'custom',
      customProviderModule: 'vitest-monocart-coverage',
    },
  },
})
