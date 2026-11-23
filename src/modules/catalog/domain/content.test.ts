import { describe, expect, it } from 'vitest'
import { contentFromText, contentToText, productContent } from './content'

describe('product content tabs (A6)', () => {
  it('defaults to empty tabs', () => {
    expect(productContent.parse(undefined)).toEqual({
      specs: [],
      howTo: [],
      faq: [],
      benefits: [],
      whyBuy: [],
    })
    const blank = { specs: '', howTo: '', faq: '', benefits: '', whyBuy: '' }
    expect(contentFromText(blank)).toEqual(productContent.parse({}))
  })

  it('reads one entry per line, specs as "Label: value", FAQ blocks split by a blank line', () => {
    const c = contentFromText({
      specs: 'Fabric: Cotton\n\n  Size: Free size: fits M–XL \nno colon here',
      howTo: ' Wash cold \n\nDry in shade',
      faq: 'Does it shrink?\nNo — pre-washed.\nHand wash is best.\n\n\nIs COD available?\nYes\n\nOnly a question',
      benefits: 'Soft',
      whyBuy: '',
    })
    expect(c).toEqual({
      specs: [
        { label: 'Fabric', value: 'Cotton' },
        { label: 'Size', value: 'Free size: fits M–XL' },
      ],
      howTo: ['Wash cold', 'Dry in shade'],
      faq: [
        { q: 'Does it shrink?', a: 'No — pre-washed.\nHand wash is best.' },
        { q: 'Is COD available?', a: 'Yes' },
      ],
      benefits: ['Soft'],
      whyBuy: [],
    })
    expect(contentFromText(contentToText(c))).toEqual(c)
  })
})
