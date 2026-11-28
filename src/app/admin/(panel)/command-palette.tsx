'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Icon } from '@/ui/icon'
import { adminSearch, type SearchHit } from './search-actions'

type Labels = Record<'open' | 'placeholder' | 'menus' | 'orders' | 'products' | 'none', string>

/** ⌘K / Ctrl+K: jump to any screen, order or product. */
export const CommandPalette = ({ menu, labels }: { menu: SearchHit[]; labels: Labels }) => {
  const dialog = useRef<HTMLDialogElement>(null)
  const [q, setQ] = useState('')
  const [found, setFound] = useState<{ orders: SearchHit[]; products: SearchHit[] }>({
    orders: [],
    products: [],
  })
  const [, start] = useTransition()
  const open = () => dialog.current?.showModal()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const search = (v: string) => {
    setQ(v)
    // Two characters before asking the server: one letter matches half the shop.
    if (v.trim().length < 2) setFound({ orders: [], products: [] })
    else start(async () => setFound(await adminSearch(v.trim())))
  }
  const menus = q ? menu.filter((m) => m.label.toLowerCase().includes(q.toLowerCase())) : menu
  const groups: [string, SearchHit[]][] = [
    [labels.menus, menus.slice(0, 6)],
    [labels.orders, found.orders],
    [labels.products, found.products],
  ]
  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex min-h-10 flex-1 items-center gap-2 rounded-control bg-soft px-3 text-sm text-muted md:max-w-sm"
      >
        <Icon name="search" size={16} />
        <span className="flex-1 text-left">{labels.open}</span>
        <kbd className="hidden rounded border border-line px-1.5 text-xs md:inline">⌘K</kbd>
      </button>
      <dialog
        ref={dialog}
        aria-label={labels.open}
        className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-card bg-surface p-0 text-text shadow-xl backdrop:bg-black/40"
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => search(e.target.value)}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="min-h-12 w-full border-b border-line bg-transparent px-4 text-base outline-none"
        />
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {groups.every(([, hits]) => hits.length === 0) && (
            <p className="p-3 text-sm text-muted">{labels.none}</p>
          )}
          {groups
            .filter(([, hits]) => hits.length > 0)
            .map(([title, hits]) => (
              <section key={title} aria-label={title} className="flex flex-col">
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase text-muted">{title}</p>
                {hits.map((h) => (
                  <Link
                    key={h.href}
                    href={h.href}
                    onClick={() => dialog.current?.close()}
                    className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm hover:bg-soft"
                  >
                    <span className="flex-1 font-semibold">{h.label}</span>
                    <span className="text-xs text-muted">{h.detail}</span>
                  </Link>
                ))}
              </section>
            ))}
        </div>
      </dialog>
    </>
  )
}
