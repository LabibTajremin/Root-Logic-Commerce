'use client'

import { useEffect, useRef } from 'react'

/**
 * H5: when the pointer leaves through the top of the window (heading for the tab bar),
 * show the offer once per visit. Touch screens have no such moment, so they never see it.
 */
export const ExitPopup = ({
  id,
  text,
  labels,
}: {
  id: string
  text: string
  labels: { order: string; close: string }
}) => {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const key = `rlc-exit-${id}`
    const leave = (e: MouseEvent) => {
      if (e.clientY > 0 || e.relatedTarget || sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
      dialog.current!.showModal()
    }
    document.addEventListener('mouseout', leave)
    return () => document.removeEventListener('mouseout', leave)
  }, [id])
  return (
    <dialog
      ref={dialog}
      aria-label={labels.order}
      className="m-auto max-w-sm rounded-card border border-line bg-surface p-6 text-text backdrop:bg-black/50"
    >
      <form method="dialog" className="flex flex-col gap-4">
        <p className="text-lg font-semibold">{text}</p>
        <a
          href="#order"
          onClick={() => dialog.current!.close()}
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-button px-4 font-semibold text-button-text"
        >
          {labels.order}
        </a>
        <button className="min-h-11 underline">{labels.close}</button>
      </form>
    </dialog>
  )
}
