'use client'

import { usePathname } from 'next/navigation'
import type { Locale } from '@/i18n'

export const LangToggle = ({ locale }: { locale: Locale }) => {
  const back = usePathname()
  return (
    <nav
      aria-label="Language"
      className="inline-flex rounded-full bg-soft p-0.5 text-xs font-semibold"
    >
      {(['en', 'bn'] as const).map((l) => (
        <a
          key={l}
          href={`/admin/lang?to=${l}&back=${encodeURIComponent(back)}`}
          aria-current={l === locale ? 'true' : undefined}
          className="rounded-full px-3 py-1.5 text-muted aria-[current]:bg-surface aria-[current]:text-text"
        >
          {l === 'en' ? 'EN' : 'বাং'}
        </a>
      ))}
    </nav>
  )
}
