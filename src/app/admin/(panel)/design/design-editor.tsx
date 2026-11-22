'use client'

import { Fragment, useEffect, useRef, useState, useTransition } from 'react'
import {
  contrastWarnings,
  brandImageSlots,
  fontIds,
  footerStyles,
  mergeDesign,
  patternIds,
  toCssVars,
  type DeepPartial,
  type Design,
} from '@/modules/site-settings'
import { Icon } from '@/ui/icon'
import { publishDesign } from './actions'

type Props = {
  initial: Design
  version: number
  /** Theme id → its default fonts/colors/style, applied when the owner switches theme. */
  themes: Record<string, DeepPartial<Design>>
  labels: Record<string, string>
}

const sel = 'min-h-11 w-full rounded-control border border-line bg-surface px-3'

export const DesignEditor = ({ initial, version: v0, themes, labels: L }: Props) => {
  const [d, setD] = useState(initial)
  const [version, setVersion] = useState(v0)
  // A logo/icon saved on this page bumps the stored version: adopt it and the new images,
  // keeping the owner's unsaved edits, so the next Publish doesn't hit a false conflict.
  useEffect(() => {
    if (v0 <= version) return
    setVersion(v0)
    setD((x) => ({
      ...x,
      brand: {
        ...x.brand,
        ...Object.fromEntries(brandImageSlots.map((s) => [s, initial.brand[s]])),
      },
    }))
  }, [v0, version, initial])
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const frame = useRef<HTMLIFrameElement>(null)
  const css = toCssVars(d)
  const warnings = contrastWarnings(d)

  // Same-origin preview: write the CSS variables straight into the storefront iframe.
  const paint = () => {
    // Same-origin iframe: a document (about:blank before load) always exists.
    const doc = frame.current!.contentDocument!
    const tag =
      doc.getElementById('rlc-preview') ??
      doc.head.appendChild(Object.assign(doc.createElement('style'), { id: 'rlc-preview' }))
    tag.textContent = css
  }
  useEffect(paint)

  const set = <K extends keyof Design>(k: K, patch: Partial<Design[K]>) =>
    setD((x) => ({ ...x, [k]: { ...(x[k] as object), ...patch } }))
  const publish = () =>
    start(async () => {
      const form = new FormData()
      form.set('design', JSON.stringify(d))
      form.set('version', String(version))
      const r = await publishDesign(form)
      setMsg(r.error ?? L.published!)
      if (!r.error) setVersion(version + 1)
    })

  const select = (
    id: string,
    label: string,
    value: string,
    options: readonly string[],
    on: (v: string) => void,
  ) => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={id}>
      {label}
      <select id={id} value={value} onChange={(e) => on(e.target.value)} className={sel}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
  const color = (k: 'accent' | 'button' | 'header' | 'text', label: string) => (
    <label className="flex min-h-11 items-center gap-3 text-sm" htmlFor={`color-${k}`}>
      <input
        id={`color-${k}`}
        type="color"
        value={d.colors[k] ?? '#111111'}
        onChange={(e) => set('colors', { [k]: e.target.value.toUpperCase() })}
        className="size-10 rounded-control border border-line"
      />
      <span className="flex-1">{label}</span>
      <code className="rounded bg-soft px-2 py-1 text-xs">{d.colors[k] ?? 'auto'}</code>
    </label>
  )
  const range = (id: string, label: string, value: number, on: (n: number) => void) => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={id}>
      <span className="flex justify-between">
        {label}
        <output>{value}%</output>
      </span>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => on(Number(e.target.value))}
        className="accent-[var(--color-accent)]"
      />
    </label>
  )
  const check = (id: string, label: string, value: boolean, on: (b: boolean) => void) => (
    <label className="flex min-h-11 items-center justify-between gap-3 text-sm" htmlFor={id}>
      {label}
      <input
        id={id}
        type="checkbox"
        checked={value}
        onChange={(e) => on(e.target.checked)}
        className="size-6 accent-[var(--color-accent)]"
      />
    </label>
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5">
        {select('themeId', L.theme!, d.themeId, Object.keys(themes), (themeId) =>
          setD((x) => {
            const next = mergeDesign(x, themes[themeId]!, { themeId }) as Design
            // A custom text color rarely suits another theme's background: back to auto-contrast.
            return { ...next, colors: { ...next.colors, text: undefined } }
          }),
        )}
        <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor="brand-name">
          {L.storeName}
          <input
            id="brand-name"
            value={d.brand.name}
            onChange={(e) => set('brand', { name: e.target.value })}
            className={sel}
          />
        </label>
        {check('showName', L.showName!, d.brand.showName, (b) => set('brand', { showName: b }))}
        <div className="grid grid-cols-2 gap-3">
          {select('nameFont', L.nameFont!, d.brand.nameFont, fontIds, (v) =>
            set('brand', { nameFont: v as Design['brand']['nameFont'] }),
          )}
          {select('siteFont', L.siteFont!, d.brand.siteFont, fontIds, (v) =>
            set('brand', { siteFont: v as Design['brand']['siteFont'] }),
          )}
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-semibold">{L.colors}</legend>
          {color('accent', L.accent!)}
          {color('button', L.button!)}
          {color('header', L.header!)}
          {color('text', L.text!)}
          {warnings.length > 0 && (
            <p
              role="alert"
              className="mt-1 flex gap-2 rounded-control bg-warning/10 p-3 text-sm text-warning"
            >
              <Icon name="alert" size={18} />
              {L.lowContrast!.replace('{{list}}', warnings.join(', '))}
            </p>
          )}
        </fieldset>
        {select('mode', L.mode!, d.mode.base, ['light', 'dark'], (v) =>
          set('mode', { base: v as 'light' }),
        )}
        {/* Sliders: cream → white, warm ↔ cool (50 = neutral), midnight → black. */}
        {range('lightBg', L.lightBg!, d.mode.light, (n) => set('mode', { light: n }))}
        {range('warmth', L.warmth!, d.mode.warmth, (n) => set('mode', { warmth: n }))}
        {range('darkBg', L.darkBg!, d.mode.dark, (n) => set('mode', { dark: n }))}
        {check('visitorToggle', L.visitorToggle!, d.mode.visitorToggle, (b) =>
          set('mode', { visitorToggle: b }),
        )}
        {select('pattern', L.pattern!, d.background.pattern, ['none', ...patternIds], (v) =>
          set('background', { pattern: v }),
        )}
        {range('patternOpacity', L.patternOpacity!, d.background.patternOpacity, (n) =>
          set('background', { patternOpacity: n }),
        )}
        {range('headerOpacity', L.headerOpacity!, d.header.opacity, (n) =>
          set('header', { opacity: n }),
        )}
        {check('sticky', L.sticky!, d.header.sticky, (b) => set('header', { sticky: b }))}
        <div className="grid grid-cols-2 gap-3">
          {select('card', L.card!, d.style.card, ['flat', 'bordered', 'elevated', 'glass'], (v) =>
            set('style', { card: v as 'flat' }),
          )}
          {select(
            'showcase',
            L.showcase!,
            d.style.showcase,
            ['grid', 'carousel', 'list', 'hero'],
            (v) => set('style', { showcase: v as 'grid' }),
          )}
          {select('hover', L.hover!, d.style.hover, ['none', 'lift', 'zoom', 'glow'], (v) =>
            set('style', { hover: v as 'lift' }),
          )}
          {select(
            'motion',
            L.motion!,
            d.style.motion,
            ['none', 'subtle', 'smooth', 'playful'],
            (v) => set('style', { motion: v as 'subtle' }),
          )}
        </div>
        {select('footerStyle', L.footerStyle!, d.footer.style, footerStyles, (v) =>
          set('footer', { style: v as 'classic' }),
        )}
        {(['categories', 'help', 'payments'] as const).map((k) => (
          <Fragment key={k}>
            {check(`footer-${k}`, L[`footer_${k}`]!, d.footer.show[k], (b) =>
              set('footer', { show: { ...d.footer.show, [k]: b } }),
            )}
          </Fragment>
        ))}
        <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor="footer-text">
          {L.footer}
          <input
            id="footer-text"
            value={d.footer.text ?? ''}
            onChange={(e) => set('footer', { text: e.target.value })}
            className={sel}
          />
        </label>
        <button
          type="button"
          onClick={publish}
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-button px-4 text-sm font-semibold text-button-text"
        >
          <Icon name="check" size={18} />
          {L.publish}
        </button>
        {msg && (
          <p role="status" className="text-sm">
            {msg}
          </p>
        )}
      </div>
      <div className="flex flex-col items-center gap-4 rounded-card bg-soft p-4">
        <div className="flex w-full items-center justify-between">
          <p className="text-sm font-semibold">{L.preview}</p>
          <div
            role="group"
            className="inline-flex rounded-control border border-line bg-surface p-0.5 text-sm"
          >
            {(['mobile', 'desktop'] as const).map((x) => (
              <button
                key={x}
                type="button"
                aria-pressed={device === x}
                onClick={() => setDevice(x)}
                className="min-h-10 rounded-control px-3 aria-pressed:bg-accent-tint aria-pressed:text-accent-ink"
              >
                {L[x]}
              </button>
            ))}
          </div>
        </div>
        <iframe
          ref={frame}
          onLoad={paint}
          title={L.preview}
          src="/"
          className="h-[720px] max-w-full rounded-card border border-line bg-bg"
          style={{ width: device === 'mobile' ? 390 : 1280 }}
        />
        <pre data-testid="design-css" hidden>
          {css}
        </pre>
      </div>
    </div>
  )
}
