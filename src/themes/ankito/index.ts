import type { Theme } from '../_contract'
import { Header, Hero, ProductCard } from './slots'

// Built from the owner's own site (ankito-run.vercel.app) — tokens in PROGRESS.md › Decisions.
export const theme: Theme = {
  id: 'ankito',
  name: 'Ankito',
  niche: 'Home-made food and crafts — warm, friendly, Bangla-first',
  preview: '/themes/ankito.svg',
  defaults: {
    brand: { nameFont: 'dm-serif-display', siteFont: 'dm-sans' },
    mode: { base: 'light', light: 'cream' },
    colors: { accent: '#A8763E', button: '#3C6430', header: '#FBF8F2' },
    style: { card: 'elevated', showcase: 'grid', hover: 'lift', motion: 'smooth' },
  },
  palette: {
    light: {
      surface: '#FFFFFF',
      soft: '#F4EEE2',
      muted: '#5A6556',
      line: '#E7DFCF',
      accentTint: '#F6EAD8',
    },
    dark: {
      surface: '#142016',
      soft: '#1B2A1D',
      muted: '#A7B3A2',
      line: '#2C3B2D',
      accentTint: '#2E2617',
    },
  },
  radius: { card: 18, control: 10 },
  slots: { Header, Hero, ProductCard },
}
