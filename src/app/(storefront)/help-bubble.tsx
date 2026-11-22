import { Icon } from '@/ui/icon'

export type HelpLink = { href: string; label: string }

/**
 * B9: one floating button instead of scattered ones. A plain <details>, so it opens
 * without JavaScript; only the contact channels the owner filled in are listed.
 */
export const HelpBubble = ({
  links,
  label,
  top,
}: {
  links: HelpLink[]
  label: string
  top: string
}) => (
  // A labelled landmark, so the opened list is never stray page content.
  <aside aria-label={label} className="fixed bottom-20 right-4 z-30 lg:bottom-6">
    <details className="group">
      <summary className="flex size-14 cursor-pointer list-none items-center justify-center rounded-full bg-button text-button-text shadow-lg [&::-webkit-details-marker]:hidden">
        <Icon name="chat" size={24} />
        <span className="sr-only">{label}</span>
      </summary>
      <ul className="absolute bottom-16 right-0 flex w-56 flex-col gap-1 rounded-card border border-line bg-surface p-2 shadow-xl">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="flex min-h-11 items-center rounded-control px-3 text-sm font-semibold hover:bg-soft"
            >
              {l.label}
            </a>
          </li>
        ))}
        <li>
          <a
            href="#top"
            className="flex min-h-11 items-center rounded-control px-3 text-sm hover:bg-soft"
          >
            {top}
          </a>
        </li>
      </ul>
    </details>
  </aside>
)
