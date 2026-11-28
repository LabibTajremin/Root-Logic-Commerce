import type { Theme } from '../_contract'
import { Hero, ProductCard } from './slots'

export const theme: Theme = {
  id: 'organic',
  name: 'Organic',
  niche: 'Grocery, honey, rice, tea — natural and fresh',
  preview: '/themes/organic.svg',
  defaults: {
    brand: { nameFont: 'fraunces', siteFont: 'manrope' },
    mode: { base: 'light', light: 0 },
    colors: { accent: '#4E7A3A', button: '#3F6B2F', header: '#FBF8F2' },
    style: { card: 'flat', showcase: 'grid', hover: 'zoom', motion: 'smooth' },
  },
  palette: {
    light: {
      surface: '#FFFFFF',
      soft: '#F1EDE3',
      muted: '#56614F',
      line: '#E3DCCB',
      accentTint: '#E8F0E1',
    },
    dark: {
      surface: '#151B2E',
      soft: '#1C2338',
      muted: '#A3ADBF',
      line: '#2A3247',
      accentTint: '#1F2B1A',
    },
  },
  radius: { card: 20, control: 14 },
  slots: { Hero, ProductCard },
}
