import type { ComponentType, ReactNode } from 'react'
import type { DeepPartial, Design } from '@/modules/site-settings'

/** Colors a theme owns; brand colors (accent, button, header, text, bg) come from the Design. */
export type Palette = {
  surface: string
  soft: string
  muted: string
  line: string
  accentTint: string
}

/** `showName: false` keeps the name for screen readers but hides the logo text. */
export type StoreView = {
  name: string
  slug: string
  showName: boolean
  /** Owner's uploaded logos (media URLs), null when none. */
  logo: string | null
  footerLogo: string | null
}
export type CategoryView = { name: string; slug: string }
/** `src` is the media base URL; the image loader appends the width. */
export type ImageView = { src: string; color: string }
export type ProductView = {
  id: string
  name: string
  slug: string
  price: string
  compareAt: string | null
  inStock: boolean
  /** A3: "Save N%" then the owner's badge. */
  badges: { text: string; tone: 'accent' | 'success' | 'danger' | 'neutral' }[]
  /** A4: units left when low (null = don't show). */
  left: number | null
  image: ImageView | null
}

export type Slots = {
  Header: ComponentType<{ store: StoreView; categories: CategoryView[]; actions: ReactNode }>
  Footer: ComponentType<{
    store: StoreView
    categories: CategoryView[]
    text?: string
    credit: boolean
    labels: Record<string, string>
    /** Owner's footer layout and which blocks show (J1). */
    look: {
      style: 'classic' | 'centered' | 'minimal'
      show: { categories: boolean; help: boolean; payments: boolean }
    }
    /** CMS pages the owner put in the footer (J8). */
    pages: { slug: string; title: string }[]
  }>
  Hero: ComponentType<{ store: StoreView; title: string; sub: string; cta: ReactNode }>
  ProductCard: ComponentType<{
    product: ProductView
    action: ReactNode
    labels: { soldOut: string; left: string }
  }>
  ProductGallery: ComponentType<{ name: string; images: ImageView[] }>
  CategoryNav: ComponentType<{ categories: CategoryView[]; active?: string; allLabel: string }>
  EmptyState: ComponentType<{ title: string; body: string; action?: ReactNode; level: 1 | 2 }>
}

export type Theme = {
  id: string
  name: string
  niche: string
  preview: string
  defaults: DeepPartial<Design>
  palette: { light: Palette; dark: Palette }
  radius: { card: number; control: number }
  /** Any slot left out falls back to the minimal theme's. */
  slots: Partial<Slots>
}

/** The theme's own tokens for the store's light/dark mode (brand colors come from the Design). */
export const themeCss = (t: Pick<Theme, 'palette' | 'radius'>, mode: 'light' | 'dark') => {
  const p = t.palette[mode]
  return `:root{--color-surface:${p.surface};--color-soft:${p.soft};--color-muted:${p.muted};--color-line:${p.line};--color-accent-tint:${p.accentTint};--radius-card:${t.radius.card}px;--radius-control:${t.radius.control}px}`
}
