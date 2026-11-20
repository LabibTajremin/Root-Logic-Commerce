// Environment for the e2e server (local verify + CI): in-process Postgres, seeded owner.
export const e2eEnv = {
  DATABASE_URL: 'pglite:.e2e/db',
  AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-0123',
  STORE_MODE: 'single',
  BOOTSTRAP_OWNER_EMAIL: 'owner@e2e.test',
  BOOTSTRAP_OWNER_PASSWORD: 'owner-pass-123',
  BOOTSTRAP_OWNER_NAME: 'Rahim',
  BOOTSTRAP_HOSTS: '127.0.0.1',
}
