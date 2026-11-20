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

export type StoreView = { name: string; slug: string }
export type CategoryView = { name: string; slug: string }
export type ProductView = {
  id: string
  name: string
  slug: string
  price: string
  compareAt: string | null
  inStock: boolean
}

export type Slots = {
  Header: ComponentType<{ store: StoreView; categories: CategoryView[]; actions: ReactNode }>
  Footer: ComponentType<{
    store: StoreView
    categories: CategoryView[]
    text?: string
    credit: boolean
    labels: Record<string, string>
  }>
  Hero: ComponentType<{ store: StoreView; title: string; sub: string; cta: ReactNode }>
  ProductCard: ComponentType<{
    product: ProductView
    action: ReactNode
    labels: { sale: string; soldOut: string }
  }>
  ProductGallery: ComponentType<{ name: string }>
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
  /** Any slot left out falls back to the minimal theme's. */
  slots: Partial<Slots>
}

export const paletteCss = (p: Palette) =>
  `:root{--color-surface:${p.surface};--color-soft:${p.soft};--color-muted:${p.muted};--color-line:${p.line};--color-accent-tint:${p.accentTint}}`
