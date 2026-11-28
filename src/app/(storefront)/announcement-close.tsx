'use client'

import { Icon } from '@/ui/icon'

/** Hides the bar for this page view; it returns on the next visit. */
export const AnnouncementClose = ({ label }: { label: string }) => (
  <button
    type="button"
    aria-label={label}
    onClick={(e) => e.currentTarget.closest('aside')?.remove()}
    className="inline-flex size-9 shrink-0 items-center justify-center"
  >
    <Icon name="x" size={16} />
  </button>
)
