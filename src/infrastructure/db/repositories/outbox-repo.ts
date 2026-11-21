import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm'
import type { OutboxRepo, OutboxRow, SavedTemplateRow } from '@/modules/messages'
import type { Db } from '../client'
import { messageOutbox, messageTemplates } from '../schema'

const cols = {
  id: messageOutbox.id,
  storeId: messageOutbox.storeId,
  channel: messageOutbox.channel,
  recipient: messageOutbox.recipient,
  body: messageOutbox.body,
  attempts: messageOutbox.attempts,
}
const CLAIM_MS = 5 * 60_000

export const createOutboxRepo = (db: Db): OutboxRepo => ({
  async enqueue(storeId, m) {
    await db
      .insert(messageOutbox)
      .values({ storeId, ...m })
      .onConflictDoNothing()
  },
  async claimDue(now, limit) {
    return db.transaction(async (tx) => {
      const due = await tx
        .select({ id: messageOutbox.id })
        .from(messageOutbox)
        .where(and(eq(messageOutbox.status, 'pending'), lte(messageOutbox.nextAttemptAt, now)))
        .orderBy(asc(messageOutbox.nextAttemptAt))
        .limit(limit)
        .for('update', { skipLocked: true })
      if (due.length === 0) return [] as OutboxRow[]
      return tx
        .update(messageOutbox)
        .set({ nextAttemptAt: new Date(now.getTime() + CLAIM_MS) })
        .where(
          inArray(
            messageOutbox.id,
            due.map((d) => d.id),
          ),
        )
        .returning(cols)
    })
  },
  async markSent(id) {
    await db
      .update(messageOutbox)
      .set({ status: 'sent', lastError: null })
      .where(eq(messageOutbox.id, id))
  },
  async markRetry(id, attempts, nextAttemptAt, error) {
    await db
      .update(messageOutbox)
      .set({ attempts, nextAttemptAt, lastError: error })
      .where(eq(messageOutbox.id, id))
  },
  async markFailed(id, attempts, error) {
    await db
      .update(messageOutbox)
      .set({ status: 'failed', attempts, lastError: error })
      .where(eq(messageOutbox.id, id))
  },
  async templates(storeId) {
    return (await db
      .select({
        event: messageTemplates.event,
        channel: messageTemplates.channel,
        locale: messageTemplates.locale,
        body: messageTemplates.body,
        enabled: messageTemplates.enabled,
      })
      .from(messageTemplates)
      .where(eq(messageTemplates.storeId, storeId))) as SavedTemplateRow[]
  },
  async saveTemplate(storeId, t) {
    await db
      .insert(messageTemplates)
      .values({ storeId, ...t })
      .onConflictDoUpdate({
        target: [
          messageTemplates.storeId,
          messageTemplates.event,
          messageTemplates.channel,
          messageTemplates.locale,
        ],
        set: { body: sql`excluded.body`, enabled: sql`excluded.enabled` },
      })
  },
  async recent(storeId, limit) {
    return db
      .select({
        ...cols,
        status: messageOutbox.status,
        lastError: messageOutbox.lastError,
        createdAt: messageOutbox.createdAt,
      })
      .from(messageOutbox)
      .where(eq(messageOutbox.storeId, storeId))
      .orderBy(desc(messageOutbox.createdAt))
      .limit(limit)
  },
})
