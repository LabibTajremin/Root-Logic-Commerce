import type { ComponentProps, ReactNode } from 'react'
import { Icon, type IconName } from './icon'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

const BTN = {
  primary: 'bg-button text-button-text',
  secondary: 'bg-surface text-text border border-line',
  ghost: 'text-text',
} as const

type BtnProps = { variant?: keyof typeof BTN; icon?: IconName } & ComponentProps<'button'>

export const Button = ({ variant = 'primary', icon, className, children, ...rest }: BtnProps) => (
  <button
    className={cx(
      'inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold disabled:opacity-60',
      BTN[variant],
      className,
    )}
    {...rest}
  >
    {icon && <Icon name={icon} size={18} />}
    {children}
  </button>
)

/** ⓘ hint that opens a native popover — no client JS (spec §5.9). */
export const HelpHint = ({ id, text, label }: { id: string; text: string; label: string }) => (
  <>
    <button
      type="button"
      popoverTarget={`help-${id}`}
      aria-label={label}
      className="inline-flex size-6 items-center justify-center text-muted"
    >
      <Icon name="info" size={16} />
    </button>
    <div
      id={`help-${id}`}
      popover="auto"
      className="max-w-72 rounded-control bg-text p-3 text-sm text-bg shadow-lg"
    >
      {text}
    </div>
  </>
)

type FieldProps = {
  id: string
  label: string
  help: string
  helpLabel: string
} & ComponentProps<'input'>

export const Field = ({ id, label, help, helpLabel, className, ...input }: FieldProps) => (
  <div className={cx('flex flex-col gap-1.5', className)}>
    <div className="flex items-center gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <HelpHint id={id} text={help} label={helpLabel} />
    </div>
    <input
      id={id}
      className="min-h-11 rounded-control border border-line bg-surface px-3 text-base outline-accent"
      {...input}
    />
  </div>
)

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={cx('rounded-card border border-line bg-surface p-5', className)}>
    {children}
  </section>
)

const TONE = {
  // Owners pick any accent; darkened text keeps pills readable on light tints.
  accent: 'bg-accent/10 text-accent-ink',
  // Tinted pills need darker text than the raw token to stay above WCAG AA.
  success: 'bg-success/10 text-[color-mix(in_oklab,var(--color-success),black_30%)]',
  warning: 'bg-warning/10 text-[color-mix(in_oklab,var(--color-warning),black_35%)]',
  danger: 'bg-danger/10 text-[color-mix(in_oklab,var(--color-danger),black_25%)]',
  neutral: 'bg-soft text-muted',
} as const

export const Badge = ({
  tone = 'accent',
  children,
}: {
  tone?: keyof typeof TONE
  children: ReactNode
}) => (
  <span
    className={cx(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      TONE[tone],
    )}
  >
    {children}
  </span>
)

export const LockBadge = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-ink">
    <Icon name="lock" size={12} />
    {label}
  </span>
)
