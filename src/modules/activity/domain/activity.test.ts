import { describe, expect, it } from 'vitest'
import { changedPaths, isUndoable } from './activity'

describe('activity log (F3)', () => {
  it('lists what changed, two levels deep', () => {
    expect(
      changedPaths(
        { colors: { accent: '#000000', button: '#111111' }, brand: { name: 'A' }, x: 1 },
        { colors: { accent: '#FFFFFF', button: '#111111' }, brand: { name: 'A' }, y: [1] },
      ),
    ).toEqual(['colors.accent', 'x', 'y'])
    expect(changedPaths({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toEqual(['a.b'])
    expect(changedPaths(1, 1)).toEqual([])
    expect(changedPaths(null, { a: 1 })).toEqual(['*'])
  })

  it('knows which actions can be undone', () => {
    expect(isUndoable('settings.design')).toBe(true)
    expect(isUndoable('order.cancel')).toBe(false)
  })
})
