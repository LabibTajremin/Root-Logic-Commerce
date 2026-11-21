'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button, Field } from '@/ui/primitives'

type Labels = Record<
  'email' | 'password' | 'submit' | 'error' | 'limited' | 'helpEmail' | 'helpPassword' | 'help',
  string
>

// Posts straight to the auth endpoint so Better Auth's rate limiter sees every attempt.
export const LoginForm = ({ labels }: { labels: Labels }) => {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    })
    setBusy(false)
    if (res.ok) return router.push('/admin')
    setError(res.status === 429 ? labels.limited : labels.error)
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
        label={labels.email}
        help={labels.helpEmail}
        helpLabel={labels.help}
      />
      <Field
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        label={labels.password}
        help={labels.helpPassword}
        helpLabel={labels.help}
      />
      {error && (
        <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {labels.submit}
      </Button>
    </form>
  )
}
