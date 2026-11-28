'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { popupDue, popupFits } from '@/modules/promotions/client'
import { OrderNow } from './cart-buttons'
import type { Item } from './cart-store'
import { NewsletterForm, type NewsletterLabels } from './newsletter-form'

export type PopupView = {
  id: string
  kind: 'offer' | 'product' | 'exit' | 'newsletter'
  title: string
  text: string
  cta: string
  href: string
  pages: 'all' | 'home' | 'product' | 'checkout'
  trigger: 'delay' | 'scroll' | 'exit'
  delay: number
  scroll: number
  everyDays: number
  device: 'all' | 'mobile' | 'desktop'
  product: { item: Item; price: string } | null
}

/**
 * B8: the first popup that fits this page and screen and is due on this device, shown on
 * its trigger (after a delay, past a scroll depth, or when the pointer leaves the window).
 */
export const Popups = ({
  popups,
  labels,
}: {
  popups: PopupView[]
  labels: NewsletterLabels & { close: string; notNow: string; buy: string; keepGoing: string }
}) => {
  const path = usePathname()
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState<PopupView | null>(null)
  useEffect(() => {
    const mobile = matchMedia('(max-width: 767px)').matches
    const key = (id: string) => `rlc-popup-${id}`
    const p = popups.find(
      (x) =>
        popupFits(x, path, mobile) &&
        popupDue(x.everyDays, Number(localStorage.getItem(key(x.id))) || null, Date.now()),
    )
    if (!p) return
    const show = () => (localStorage.setItem(key(p.id), String(Date.now())), setOpen(p))
    if (p.trigger === 'delay') {
      const timer = setTimeout(show, p.delay * 1000)
      return () => clearTimeout(timer)
    }
    if (p.trigger === 'scroll') {
      const seen = () => {
        const el = document.documentElement
        if (((scrollY + innerHeight) / el.scrollHeight) * 100 < p.scroll) return
        removeEventListener('scroll', seen)
        show()
      }
      addEventListener('scroll', seen, { passive: true })
      return () => removeEventListener('scroll', seen)
    }
    const leave = (e: MouseEvent) => {
      if (e.clientY > 0 || e.relatedTarget) return
      document.removeEventListener('mouseout', leave)
      show()
    }
    document.addEventListener('mouseout', leave)
    return () => document.removeEventListener('mouseout', leave)
  }, [path, popups])
  useEffect(() => {
    if (open) dialog.current!.showModal()
  }, [open])
  if (!open) return null
  const close =
    open.kind === 'product' ? labels.notNow : open.kind === 'exit' ? labels.keepGoing : labels.close
  return (
    <dialog
      ref={dialog}
      onClose={() => setOpen(null)}
      aria-label={open.title}
      className="m-auto w-full max-w-sm rounded-card border border-line bg-surface p-6 text-text backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-xl">{open.title}</h2>
        {open.text && <p className="text-muted">{open.text}</p>}
        {open.product && (
          <div className="flex items-center gap-3 rounded-control bg-soft p-3">
            <span className="flex-1 text-sm">
              {open.product.item.name} · <strong>{open.product.price}</strong>
            </span>
            <span className="w-28">
              <OrderNow item={open.product.item} qty={1} label={labels.buy} />
            </span>
          </div>
        )}
        {open.kind === 'newsletter' && <NewsletterForm labels={labels} />}
        {open.cta && open.href && (
          <a
            href={open.href}
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-button px-4 font-semibold text-button-text"
          >
            {open.cta}
          </a>
        )}
        <form method="dialog">
          <button className="min-h-11 w-full rounded-control border border-line font-semibold">
            {close}
          </button>
        </form>
      </div>
    </dialog>
  )
}
