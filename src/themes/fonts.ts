import localFont from 'next/font/local'

// Curated font list (spec §5.8), self-hosted from @fontsource (no runtime Google calls).
// Each exposes --font-<id>; the store design picks which ones the CSS uses.

const inter = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
  preload: false,
})
const manrope = localFont({
  src: '../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
  weight: '200 800',
  variable: '--font-manrope',
  display: 'swap',
  preload: false,
})
const poppins = localFont({
  src: '../../node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2',
  weight: '400',
  variable: '--font-poppins',
  display: 'swap',
  preload: false,
})
const outfit = localFont({
  src: '../../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-outfit',
  display: 'swap',
  preload: false,
})
const dmSans = localFont({
  src: '../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2',
  weight: '100 1000',
  variable: '--font-dm-sans',
  display: 'swap',
  preload: false,
})
const playfairDisplay = localFont({
  src: '../../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2',
  weight: '400 900',
  variable: '--font-playfair-display',
  display: 'swap',
  preload: false,
})
const cormorantGaramond = localFont({
  src: '../../node_modules/@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2',
  weight: '300 700',
  variable: '--font-cormorant-garamond',
  display: 'swap',
  preload: false,
})
const dmSerifDisplay = localFont({
  src: '../../node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2',
  weight: '400',
  variable: '--font-dm-serif-display',
  display: 'swap',
  preload: false,
})
const fraunces = localFont({
  src: '../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-fraunces',
  display: 'swap',
  preload: false,
})
const hindSiliguri = localFont({
  src: '../../node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-400-normal.woff2',
  weight: '400',
  variable: '--font-hind-siliguri',
  display: 'swap',
  preload: false,
})
const notoSansBengali = localFont({
  src: '../../node_modules/@fontsource-variable/noto-sans-bengali/files/noto-sans-bengali-bengali-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-noto-sans-bengali',
  display: 'swap',
  preload: false,
})
const anekBangla = localFont({
  src: '../../node_modules/@fontsource-variable/anek-bangla/files/anek-bangla-bengali-wght-normal.woff2',
  weight: '100 800',
  variable: '--font-anek-bangla',
  display: 'swap',
  preload: false,
})
const tiroBangla = localFont({
  src: '../../node_modules/@fontsource/tiro-bangla/files/tiro-bangla-bengali-400-normal.woff2',
  weight: '400',
  variable: '--font-tiro-bangla',
  display: 'swap',
  preload: false,
})

export const fontVariables = [
  inter.variable,
  manrope.variable,
  poppins.variable,
  outfit.variable,
  dmSans.variable,
  playfairDisplay.variable,
  cormorantGaramond.variable,
  dmSerifDisplay.variable,
  fraunces.variable,
  hindSiliguri.variable,
  notoSansBengali.variable,
  anekBangla.variable,
  tiroBangla.variable,
].join(' ')
