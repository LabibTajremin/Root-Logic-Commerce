import { describe, expect, it } from 'vitest'
import { helpText } from '@/help'
import bnHelp from '@/help/bn.json'
import enHelp from '@/help/en.json'
import bn from './bn.json'
import en from './en.json'
import { isLocale, translate } from '.'

describe('i18n', () => {
  it('translates, interpolates and falls back to English then the key', () => {
    expect(translate('bn', 'nav.orders')).toBe('অর্ডার')
    expect(translate('en', 'x.{{n}}')).toBe('x.{{n}}')
    expect(translate('bn', 'nope', { n: 1 })).toBe('nope')
    expect(translate('en', 'admin.signIn')).toBe('Sign in')
    expect(isLocale('bn')).toBe(true)
    expect(isLocale('fr')).toBe(false)
  })
  it('interpolates variables', () => {
    expect(translate('en', 'Hello {{name}} {{missing}}', { name: 'Rahim' })).toBe('Hello Rahim ')
  })
  it('every English UI and help key has a Bangla translation', () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort())
    expect(Object.keys(bnHelp).sort()).toEqual(Object.keys(enHelp).sort())
  })
  it('returns help text with English fallback', () => {
    expect(helpText('bn', 'login.email')).toContain('ইমেইল')
    expect(helpText('en', 'unknown')).toBe('')
  })
})
