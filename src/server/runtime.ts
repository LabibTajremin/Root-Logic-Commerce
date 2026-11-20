import storeConfig from '../../store.config'
import { createAuth } from '@/infrastructure/auth/auth'
import { openDb } from '@/infrastructure/db/client'
import { ensureStore, ensureUser } from './bootstrap'
import { loadConfig } from './config'
import { createContainer } from './container'

const boot = async () => {
  const config = loadConfig(process.env, storeConfig)
  const db = await openDb(config.databaseUrl)
  const env = process.env
  if (env.BOOTSTRAP_OWNER_EMAIL && env.BOOTSTRAP_OWNER_PASSWORD) {
    await ensureStore(db, {
      slug: config.store.slug,
      name: config.store.name,
      hosts: (env.BOOTSTRAP_HOSTS ?? '').split(',').filter(Boolean),
      owner: {
        email: env.BOOTSTRAP_OWNER_EMAIL,
        password: env.BOOTSTRAP_OWNER_PASSWORD,
        name: env.BOOTSTRAP_OWNER_NAME ?? 'Owner',
      },
    })
  }
  // Root Logic Lab's own login: manages plans/entitlements for every store.
  if (env.BOOTSTRAP_SUPER_EMAIL && env.BOOTSTRAP_SUPER_PASSWORD) {
    await ensureUser(db, {
      email: env.BOOTSTRAP_SUPER_EMAIL,
      password: env.BOOTSTRAP_SUPER_PASSWORD,
      name: 'Root Logic Lab',
      role: 'SUPER_ADMIN',
      storeId: null,
    })
  }
  const container = createContainer({
    config,
    db,
    onEventError: (e, t) => console.error(`[event ${t}]`, e),
  })
  return { config, db, container, auth: createAuth(db, config.authSecret) }
}

// Next bundles route handlers and pages separately, so a module-level singleton would
// exist once per bundle (two DB pools — or two diverging PGlite instances). globalThis
// is shared by the whole Node process.
const g = globalThis as typeof globalThis & { __rlcRuntime?: ReturnType<typeof boot> }

/** One process-wide runtime (config, DB pool, modules, auth) shared by every store. */
export const runtime = () => (g.__rlcRuntime ??= boot())
