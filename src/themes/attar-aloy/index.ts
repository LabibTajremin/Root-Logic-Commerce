import type { Theme } from '../_contract'
import { Header, Hero, ProductCard } from './slots'

// Made with the new-theme skill from: "সুগন্ধির দোকান — modern perfume/fragrance boutique, light mode,
// soft floral pastels, elegant thin serif headings, airy layout, gentle smooth motion."
export const theme: Theme = {
  id: 'attar-aloy',
  name: 'আতর আলোয় (Attar Aloy)',
  niche: 'Perfume and fragrance boutiques — light, floral, airy',
  preview: '/themes/attar-aloy.svg',
  defaults: {
    brand: { nameFont: 'cormorant-garamond', siteFont: 'manrope' },
    mode: { base: 'light', light: 'offwhite' },
    colors: { accent: '#B76E8A', button: '#6B5B8C', header: '#FAFAF7' },
    style: { card: 'flat', showcase: 'grid', hover: 'glow', motion: 'smooth' },
  },
  palette: {
    light: {
      surface: '#FFFFFF',
      soft: '#F7ECEF',
      muted: '#6A5F70',
      line: '#EADCE2',
      accentTint: '#F3E1EA',
    },
    dark: {
      surface: '#1A1726',
      soft: '#241F33',
      muted: '#B8AFC4',
      line: '#352E47',
      accentTint: '#3A2433',
    },
  },
  radius: { card: 22, control: 14 },
  slots: { Header, Hero, ProductCard },
}
