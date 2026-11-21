import { hashPassword } from 'better-auth/crypto'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Db } from '@/infrastructure/db/client'
import { accounts, storeDomains, stores, users } from '@/infrastructure/db/schema'
import type { Role } from '@/modules/access'

type Login = { email: string; password: string; name: string }

/** Creates the user with a password login unless the email exists already. */
export const ensureUser = async (db: Db, u: Login & { role: Role; storeId: string | null }) => {
  const email = u.email.toLowerCase()
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  if (exists) return
  const id = randomUUID()
  await db
    .insert(users)
    .values({ id, email, name: u.name, role: u.role, storeId: u.storeId, emailVerified: true })
  await db.insert(accounts).values({
    id: randomUUID(),
    userId: id,
    accountId: id,
    providerId: 'credential',
    password: await hashPassword(u.password),
  })
}

type Seed = { slug: string; name: string; hosts: string[]; owner?: Login }

// First-deploy setup: idempotent, safe to run on every boot.
export const ensureStore = async (db: Db, seed: Seed) => {
  await db.insert(stores).values({ slug: seed.slug, name: seed.name }).onConflictDoNothing()
  const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, seed.slug))
  for (const host of seed.hosts)
    await db.insert(storeDomains).values({ storeId: store!.id, host }).onConflictDoNothing()
  if (seed.owner) await ensureUser(db, { ...seed.owner, role: 'OWNER', storeId: store!.id })
  return store!.id
}
