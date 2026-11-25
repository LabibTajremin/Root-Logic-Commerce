import { describe, expect, it } from 'vitest'
import { noSubscribe } from './static-store'

describe('noSubscribe', () => {
  it('subscribes to nothing and unsubscribes from nothing', () => {
    const off = noSubscribe()
    expect(off()).toBeUndefined()
  })
})
