import type { Theme } from '../_contract'
import { Header, Hero, ProductCard } from './slots'

export const theme: Theme = {
  id: 'attar',
  name: 'Attar',
  niche: 'Perfume, attar, gifts — dark and luxurious',
  preview: '/themes/attar.svg',
  defaults: {
    brand: { nameFont: 'cormorant-garamond', siteFont: 'manrope' },
    mode: { base: 'dark', dark: 0 },
    colors: { accent: '#C9A45C', button: '#C9A45C', header: '#0B1020' },
    style: { card: 'bordered', showcase: 'grid', hover: 'glow', motion: 'smooth' },
  },
  palette: {
    light: {
      surface: '#FFFFFF',
      soft: '#F6F1E7',
      muted: '#5E5648',
      line: '#E6DCC8',
      accentTint: '#F5ECD9',
    },
    dark: {
      surface: '#121933',
      soft: '#1A2240',
      muted: '#B9B2A2',
      line: '#2E3656',
      accentTint: '#2A2414',
    },
  },
  radius: { card: 6, control: 4 },
  slots: { Header, Hero, ProductCard },
}
