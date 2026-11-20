import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { authorize, type Permission } from '@/modules/access'
import { isDomainError } from '@/modules/shared'
import { adminContext } from './context'

export type ActionState = { error?: string; ok?: boolean }

/**
 * Server-action wrapper: authorize by role + store, run, map domain errors to a
 * translated message (never a 500), then refresh and optionally navigate.
 */
export const act = async (
  permission: Permission,
  run: (ctx: Awaited<ReturnType<typeof adminContext>>) => Promise<string | void>,
): Promise<ActionState> => {
  const ctx = await adminContext(permission)
  let to: string | void
  try {
    authorize(ctx.actor, permission, ctx.store.id)
    to = await run(ctx)
  } catch (e) {
    // Never a 500 for the owner: unknown failures are logged and shown as a retry hint.
    if (!isDomainError(e)) console.error('[admin action]', e)
    return { error: ctx.t(isDomainError(e) ? `error.${e.code}` : 'error.unexpected') }
  }
  revalidatePath('/admin', 'layout')
  if (to) redirect(to)
  return { ok: true }
}
