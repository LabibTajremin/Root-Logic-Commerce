'use client'

import { useRouter } from 'next/navigation'
import { Icon } from '@/ui/icon'

export const SignOut = ({ label }: { label: string }) => {
  const router = useRouter()
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-full text-muted"
      onClick={async () => {
        await fetch('/api/auth/sign-out', { method: 'POST' })
        router.push('/admin/login')
      }}
    >
      <Icon name="logout" />
    </button>
  )
}
