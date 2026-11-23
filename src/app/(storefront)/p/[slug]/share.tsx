import { CopyLink } from './copy-link'

type Labels = Record<'share' | 'facebook' | 'whatsapp' | 'messenger' | 'copy' | 'copied', string>

/** A12: share links (no third-party scripts) and copy link. */
export const Share = ({ url, labels }: { url: string; labels: Labels }) => {
  const u = encodeURIComponent(url)
  const links = [
    ['facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['whatsapp', `https://wa.me/?text=${u}`],
    ['messenger', `fb-messenger://share/?link=${u}`],
  ] as const
  return (
    <div
      role="group"
      aria-label={labels.share}
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <span className="font-semibold">{labels.share}</span>
      {links.map(([k, href]) => (
        <a
          key={k}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-11 content-center rounded-control border border-line px-3"
        >
          {labels[k]}
        </a>
      ))}
      <CopyLink url={url} labels={{ copy: labels.copy, copied: labels.copied }} />
    </div>
  )
}
