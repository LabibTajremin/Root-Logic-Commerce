import storeConfig from '../../store.config'
import { createAuth } from '@/infrastructure/auth/auth'
import { openDb } from '@/infrastructure/db/client'
import { ensureStore } from './bootstrap'
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
  const container = createContainer({
    config,
    db,
    onEventError: (e, t) => console.error(`[event ${t}]`, e),
  })
  return { config, db, container, auth: createAuth(db, config.authSecret) }
}

let ready: ReturnType<typeof boot> | undefined

/** One process-wide runtime (config, DB pool, modules, auth) shared by every store. */
export const runtime = () => (ready ??= boot())
