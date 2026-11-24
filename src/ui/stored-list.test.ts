import { describe, expect, it } from 'vitest'
import { storedList } from './stored-list'

describe('storedList', () => {
  const empty: number[] = []
  it('reads a JSON array', () => expect(storedList('[1,2]', empty)).toEqual([1, 2]))
  it('drops broken JSON and non-arrays', () => {
    expect(storedList('{oops', empty)).toBe(empty)
    expect(storedList('{"a":1}', empty)).toBe(empty)
  })
})
