'use client'

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from 'react'

export type FormState = { error?: string; ok?: boolean }
type Action = (prev: FormState, form: FormData) => Promise<FormState>

/**
 * Form bound to a server action; shows the translated domain error or a saved note.
 * Submitted manually so a validation error never wipes what the owner typed
 * (React resets uncontrolled forms after `action=`); cleared only on success.
 */
export const ActionForm = ({
  action,
  children,
  className,
  saved,
  id,
}: {
  action: Action
  children: ReactNode
  className?: string
  saved?: string
  /** Lets controls elsewhere on the page join with `form={id}` (bulk selection). */
  id?: string
}) => {
  const [state, run, pending] = useActionState(action, {})
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok) ref.current?.reset()
  }, [state])
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter)
    startTransition(() => run(data))
  }
  return (
    <form ref={ref} id={id} onSubmit={submit} className={className} aria-busy={pending}>
      {children}
      {state.error && (
        <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && saved && (
        <p role="status" className="text-sm text-success">
          {saved}
        </p>
      )}
    </form>
  )
}
