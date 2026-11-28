'use client'

import { Icon } from '@/ui/icon'

export const PrintButton = ({ label }: { label: string }) => (
  <button
    type="button"
    onClick={() => window.print()}
    className="inline-flex min-h-11 items-center gap-2 rounded-control bg-button px-4 text-sm font-semibold text-button-text print:hidden"
  >
    <Icon name="receipt" size={18} />
    {label}
  </button>
)
