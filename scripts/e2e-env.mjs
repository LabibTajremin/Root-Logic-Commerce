// Environment for the e2e server (local verify + CI): in-process Postgres, seeded owner.
export const e2eEnv = {
  DATABASE_URL: 'pglite:.e2e/db',
  AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-0123',
  STORE_MODE: 'single',
  BOOTSTRAP_OWNER_EMAIL: 'owner@e2e.test',
  BOOTSTRAP_OWNER_PASSWORD: 'owner-pass-123',
  BOOTSTRAP_OWNER_NAME: 'Rahim',
  BOOTSTRAP_HOSTS: '127.0.0.1',
  BOOTSTRAP_SUPER_EMAIL: 'lab@e2e.test',
  BOOTSTRAP_SUPER_PASSWORD: 'lab-pass-12345',
  NOTIFY_LOG_FILE: '.e2e/notify.log',
  MEDIA_DIR: '.e2e/media',
  MESSAGES_TRANSPORT: 'log',
  SETTINGS_KEY: 'e2e-settings-key-e2e-settings-key-00',
  CRON_SECRET: 'e2e-cron-secret-0123456789',
}
