import type { Theme } from '../_contract'
import { CategoryNav, EmptyState, Footer, Header, Hero, ProductCard, ProductGallery } from './slots'

export const theme: Theme = {
  id: 'minimal',
  name: 'Minimal',
  niche: 'Any shop — clean and neutral',
  preview: '/themes/minimal.svg',
  defaults: {
    brand: { nameFont: 'inter', siteFont: 'inter' },
    mode: { base: 'light', light: 100 },
    colors: { accent: '#4F46E5', button: '#18181B', header: '#FFFFFF' },
    style: { card: 'bordered', showcase: 'grid', hover: 'lift', motion: 'subtle' },
  },
  palette: {
    light: {
      surface: '#FFFFFF',
      soft: '#F4F4F5',
      muted: '#52525B',
      line: '#E4E4E7',
      accentTint: '#EEF2FF',
    },
    dark: {
      surface: '#111827',
      soft: '#1F2937',
      muted: '#A1A1AA',
      line: '#2A3441',
      accentTint: '#1E1B4B',
    },
  },
  radius: { card: 12, control: 10 },
  slots: { Header, Footer, Hero, ProductCard, ProductGallery, CategoryNav, EmptyState },
}
