'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { noSubscribe } from '@/ui/static-store'

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> }
type DetectorClass = new (options: { formats: string[] }) => Detector

/**
 * E4: read box barcodes with the camera where the browser has a BarcodeDetector; each new
 * code goes into the scan box and submits it. The code box (and a scanner gun) always works.
 */
export const CameraScan = ({
  input,
  start,
  stop,
}: {
  input: string
  start: string
  stop: string
}) => {
  // Fixed per browser: nothing to subscribe to; the server renders no camera button.
  const supported = useSyncExternalStore(
    noSubscribe,
    () => 'BarcodeDetector' in window,
    () => false,
  )
  const [on, setOn] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!on) return
    const Barcode = (window as unknown as { BarcodeDetector: DetectorClass }).BarcodeDetector
    const detector = new Barcode({ formats: ['code_128', 'qr_code', 'ean_13'] })
    let last = ''
    // Stopping waits for the camera to have started, then releases it.
    const started = navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        const v = video.current!
        v.srcObject = s
        void v.play()
        const timer = setInterval(async () => {
          const [code] = await detector.detect(v)
          // The same box stays in view for a while: submit each code once.
          if (!code || code.rawValue === last) return
          last = code.rawValue
          const field = document.getElementById(input) as HTMLInputElement
          field.value = code.rawValue
          field.form!.requestSubmit()
        }, 400)
        return () => {
          clearInterval(timer)
          s.getTracks().forEach((t) => t.stop())
        }
      })
    return () => void started.then((end) => end())
  }, [on, input])
  if (!supported) return null
  return (
    <div className="flex flex-col gap-2 print:hidden">
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setOn(!on)}
        className="min-h-11 w-fit rounded-control border border-line px-4 text-sm font-semibold"
      >
        {on ? stop : start}
      </button>
      <video
        ref={video}
        muted
        playsInline
        hidden={!on}
        className="max-h-64 w-full rounded-card bg-black"
      />
    </div>
  )
}
