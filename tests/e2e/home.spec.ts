import { test, expect } from './fixtures'

test('home renders store name and passes a11y', async ({ page, a11y }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Root Logic Commerce')
  await a11y()
})
