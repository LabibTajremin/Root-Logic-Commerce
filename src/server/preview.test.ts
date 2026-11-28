import { describe, expect, it } from 'vitest'
import { previewValue, readPreview } from './preview'

describe('layout preview cookie', () => {
  it('only accepts values signed for this store', () => {
    const v = previewValue('s3cret', 'store-1', 'fashion')
    expect(readPreview('s3cret', 'store-1', v)).toBe('fashion')
    expect(readPreview('s3cret', 'store-2', v)).toBeNull()
    expect(readPreview('other', 'store-1', v)).toBeNull()
    expect(readPreview('s3cret', 'store-1', 'fashion.x')).toBeNull()
    expect(readPreview('s3cret', 'store-1', 'nodot')).toBeNull()
    expect(readPreview('s3cret', 'store-1', undefined)).toBeNull()
  })
})
