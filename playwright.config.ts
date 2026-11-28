import { defineConfig, devices } from '@playwright/test'
import { e2eEnv } from './scripts/e2e-env.mjs'

const port = Number(process.env.E2E_PORT ?? 3100)
export const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  forbidOnly: true,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL, trace: 'off' },
  projects: [
    {
      name: 'mobile',
      testIgnore: /settings\.spec/,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
    // Both projects share one store database; desktop runs after mobile so store-wide
    // state (design, settings) never races between viewports.
    {
      name: 'desktop',
      dependencies: ['mobile'],
      testIgnore: /settings\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    // Store-wide switches (OTP, theme) change what every other test sees: run them last, alone.
    {
      name: 'settings',
      dependencies: ['desktop'],
      testMatch: /settings\.spec/,
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `pnpm next start .  -p ${port} -H 127.0.0.1`,
    env: { ...e2eEnv, COVERAGE: '1' },
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
