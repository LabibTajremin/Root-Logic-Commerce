import { hashPassword } from 'better-auth/crypto'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Db } from '@/infrastructure/db/client'
import { accounts, storeDomains, stores, users } from '@/infrastructure/db/schema'

type Seed = {
  slug: string
  name: string
  hosts: string[]
  owner?: { email: string; password: string; name: string }
}

// First-deploy setup: idempotent, safe to run on every boot.
export const ensureStore = async (db: Db, seed: Seed) => {
  await db.insert(stores).values({ slug: seed.slug, name: seed.name }).onConflictDoNothing()
  const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, seed.slug))
  for (const host of seed.hosts)
    await db.insert(storeDomains).values({ storeId: store!.id, host }).onConflictDoNothing()
  if (seed.owner) {
    const email = seed.owner.email.toLowerCase()
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
    if (!exists) {
      const id = randomUUID()
      await db.insert(users).values({
        id,
        email,
        name: seed.owner.name,
        role: 'OWNER',
        storeId: store!.id,
        emailVerified: true,
      })
      await db.insert(accounts).values({
        id: randomUUID(),
        userId: id,
        accountId: id,
        providerId: 'credential',
        password: await hashPassword(seed.owner.password),
      })
    }
  }
  return store!.id
}
