import { describe, expect, it } from 'vitest'
import { loadTheme, themeCss, themeIds } from '.'
import { theme as minimal } from './minimal'

describe('theme registry', () => {
  it('lists every theme folder and loads each with a complete slot set', async () => {
    expect([...themeIds]).toEqual(expect.arrayContaining(['minimal', 'organic', 'attar', 'ankito']))
    for (const id of themeIds) {
      const t = await loadTheme(id)
      expect(t.id).toBe(id)
      expect(Object.keys(t.slots).sort()).toEqual(Object.keys(minimal.slots).sort())
    }
    const ankito = await loadTheme('ankito')
    expect(ankito.slots.Header).not.toBe(minimal.slots.Header)
    expect(ankito.slots.Footer).toBe(minimal.slots.Footer)
  })

  it('falls back to minimal for an unknown (e.g. removed) theme', async () => {
    expect((await loadTheme('gone')).id).toBe('minimal')
  })

  it('renders theme tokens for light and dark', () => {
    expect(themeCss(minimal, 'light')).toContain('--color-surface:#FFFFFF')
    expect(themeCss(minimal, 'dark')).toContain('--radius-card:12px')
  })
})
