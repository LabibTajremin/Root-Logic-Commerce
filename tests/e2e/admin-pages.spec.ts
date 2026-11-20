import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { signedIn } from './admin'

const uid = () => `${test.info().project.name}-${Date.now().toString(36)}`
const saved = (page: Page) =>
  expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
const alert = (page: Page, text: string | RegExp) =>
  expect(page.getByRole('alert').filter({ hasText: text })).toBeVisible()

test('categories: add, nest, rename, block cycles, reorder and archive', async ({ page, a11y }) => {
  const id = uid()
  await signedIn(page)
  await page.goto('/admin/categories')
  await a11y()
  for (const name of [`Rice ${id}`, `Oil ${id}`]) {
    await page.getByLabel('Category name').fill(name)
    await page.getByRole('button', { name: 'Add category' }).click()
    await expect(page.getByRole('link', { name: name })).toBeVisible()
  }
  await page.getByLabel('Category name').fill(`Miniket ${id}`)
  await page.getByLabel('Parent category').selectOption({ label: `Rice ${id}` })
  await page.getByRole('button', { name: 'Add category' }).click()
  await expect(page.getByRole('link', { name: `Miniket ${id}` })).toBeVisible()

  await page.getByRole('link', { name: `Rice ${id}` }).click()
  await expect(page.getByRole('heading', { name: 'Edit category' })).toBeVisible()
  await page.getByLabel('Parent category').selectOption({ label: `Miniket ${id}` })
  await page.getByRole('button', { name: 'Save' }).click()
  await alert(page, 'A category cannot be moved inside itself.')
  await page.getByLabel('Parent category').selectOption({ label: '— None —' })
  await page.getByLabel('Category name').fill(`Rice+ ${id}`)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('link', { name: `Rice+ ${id}` })).toBeVisible()

  const handle = page
    .getByRole('listitem')
    .filter({ hasText: `Oil ${id}` })
    .getByRole('button', { name: 'Drag to reorder' })
  await handle.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Space')
  await page.waitForLoadState('networkidle')

  await page.getByRole('link', { name: `Oil ${id}` }).click()
  await page.getByRole('button', { name: 'Archive' }).click()
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: `Oil ${id}` })
      .getByText('Archived'),
  ).toBeVisible()
})

test('products: validation, create, edit, reorder and stock adjustments', async ({
  page,
  a11y,
}) => {
  const id = uid()
  await signedIn(page)
  await page.goto('/admin/products')
  await page.getByRole('link', { name: 'Add product' }).click()
  await a11y()
  await page.getByLabel('Product name').fill(`Mug ${id}`)
  await page.getByLabel('Price (৳)', { exact: true }).fill('850')
  await page.getByLabel('Compare-at price (৳)').fill('800')
  await page.getByRole('button', { name: 'Save' }).click()
  await alert(page, 'Please check the highlighted fields.')
  await page.getByLabel('Compare-at price (৳)').fill('990')
  await page.getByLabel('Cost price (৳)').fill('400')
  await page.getByLabel('Stock quantity').fill('2')
  await page.getByLabel('SKU (optional)').fill('MUG-1')
  await page.getByLabel('SEO title').fill('Mug')
  await page.getByLabel('Description', { exact: true }).fill('Hand made')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  await page.getByRole('link', { name: 'Add product' }).click()
  await page.getByLabel('Product name').fill(`Bowl ${id}`)
  await page.getByLabel('Price (৳)', { exact: true }).fill('299')
  await page.getByLabel('Stock quantity').fill('20')
  await page.getByLabel('Status').selectOption('draft')
  await page.getByRole('button', { name: 'Save' }).click()

  await page.getByRole('link', { name: new RegExp(`Mug ${id}`) }).click()
  await expect(page.getByRole('heading', { name: 'Edit product' })).toBeVisible()
  await expect(page.getByLabel('Price (৳)', { exact: true })).toHaveValue('850')
  await page.getByLabel('Product name').fill(`Mug XL ${id}`)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('link', { name: new RegExp(`Mug XL ${id}`) })).toBeVisible()
  const handle = page
    .getByRole('listitem')
    .filter({ hasText: `Bowl ${id}` })
    .getByRole('button', { name: 'Drag to reorder' })
  await handle.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Space')

  await page.goto('/admin/stock')
  await a11y()
  await expect(page.getByTestId('low-stock')).toContainText(`Mug XL ${id}`)
  await page.getByLabel('Product', { exact: true }).selectOption({ label: `Mug XL ${id} (2)` })
  await page.getByLabel('Change (+ add, − remove)').fill('-5')
  await page.getByLabel('Reason').fill('damaged')
  await page.getByRole('button', { name: 'Save' }).click()
  await alert(page, 'Not enough stock')
  await page.getByLabel('Change (+ add, − remove)').fill('10')
  await page.getByLabel('Reason').fill('restock')
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)
  await expect(page.getByTestId('stock-history')).toContainText('restock')
})

test('unknown ids show not found', async ({ page }) => {
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  await signedIn(page)
  await page.waitForURL(/\/admin$/)
  for (const path of [
    '/admin/products/nope',
    '/admin/orders/nope',
    '/admin/orders/nope/invoice',
    '/admin/products/00000000-0000-4000-8000-000000000000',
    '/admin/orders/00000000-0000-4000-8000-000000000000',
    '/admin/orders/00000000-0000-4000-8000-000000000000/invoice',
  ]) {
    await page.goto(path)
    await expect(page.getByText('This page could not be found.')).toBeVisible()
  }
})

test('owner invites staff; staff cannot reach owner-only settings', async ({
  page,
  browser,
  a11y,
}) => {
  const id = uid()
  const email = `staff-${id}@e2e.test`
  await signedIn(page)
  await page.goto('/admin/users')
  await a11y()
  await page.getByLabel('Full name').fill(`Karim ${id}`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Temporary password').fill('staff-pass-123')
  await page.getByRole('button', { name: 'Invite a team member' }).click()
  await saved(page)
  // React resets the form after a successful action; submit the same email again.
  await page.getByLabel('Full name').fill(`Karim ${id}`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Temporary password').fill('staff-pass-123')
  await page.getByRole('button', { name: 'Invite a team member' }).click()
  await alert(page, 'A user with this email already exists.')
  const row = page.getByRole('listitem').filter({ hasText: email })
  await row.getByRole('button', { name: 'Make owner' }).click()
  await expect(row.getByText('Owner', { exact: true })).toBeVisible()
  await row.getByRole('button', { name: 'Make staff' }).click()
  await expect(row.getByText('Staff', { exact: true })).toBeVisible()

  const staff = await browser.newPage()
  await staff.setExtraHTTPHeaders({ 'x-forwarded-for': `10.200.1.${Date.now() % 250}` })
  await signedIn(staff, email, 'staff-pass-123')
  await expect(staff.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  await staff.goto('/admin/users')
  await expect(staff.getByText('Only the store owner can manage users.')).toBeVisible()
  for (const p of ['/admin/design', '/admin/seo', '/admin/messages']) {
    await staff.goto(p)
    await expect(staff.getByText('Only the store owner can do this.')).toBeVisible()
  }
  await staff.close()
})

test('design editor previews live, warns on low contrast and publishes', async ({ page, a11y }) => {
  await signedIn(page)
  await page.goto('/admin/design')
  await expect(page.getByRole('heading', { level: 1, name: 'Design' })).toBeVisible()
  await a11y('iframe') // the storefront inside the preview is checked on its own
  await page.locator('#color-accent').fill('#a8763e')
  await page.locator('#color-text').fill('#eeeeee')
  await alert(page, /Low contrast: text/)
  await page.locator('#color-text').fill('#1e2a1c')
  await page.getByLabel('Theme').selectOption('ankito')
  await page.getByLabel('Store name').fill('Ankito')
  await page.getByLabel('Name font').selectOption('dm-serif-display')
  await page.getByLabel('Site font').selectOption('dm-sans')
  await page.locator('#color-button').fill('#3c6430')
  await page.locator('#color-header').fill('#fbf8f2')
  await page.getByLabel('Mode').selectOption('dark')
  await page.getByLabel('Mode').selectOption('light')
  await page.getByLabel('Light background').selectOption('cream')
  await page.getByLabel('Dark background').selectOption('black')
  await page.getByLabel('Let visitors switch light/dark').check()
  await page.getByLabel('Background pattern').selectOption('p07')
  await page.getByLabel('Pattern opacity').fill('30')
  await page.getByLabel('Header opacity').fill('90')
  await page.getByLabel('Sticky header').uncheck()
  await page.getByLabel('Card style').selectOption('elevated')
  await page.getByLabel('Product showcase').selectOption('carousel')
  await page.getByLabel('Hover effect').selectOption('zoom')
  await page.getByLabel('Animation').selectOption('smooth')
  await page.getByLabel('Footer text').fill('Handcrafted in Bangladesh')
  await page.getByRole('button', { name: 'Desktop' }).click()
  await page.getByRole('button', { name: 'Mobile' }).click()
  const preview = page.frameLocator('iframe[title="Live preview — not published yet"]')
  await expect
    .poll(() => preview.locator('#rlc-preview').evaluate((e) => e.textContent))
    .toMatch(/--color-accent:#A8763E/)
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible()

  // A second editor opened earlier is now stale and must not overwrite.
  const stale = await page.context().newPage()
  await stale.goto('/admin/design')
  await page.getByLabel('Footer text').fill('v2')
  await page.getByRole('button', { name: 'Publish' }).click()
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible()
  await stale.getByRole('button', { name: 'Publish' }).click()
  await expect(
    stale.getByRole('status').filter({ hasText: 'Settings were changed elsewhere' }),
  ).toBeVisible()
  await stale.close()
  await page.reload()
  await expect(page.getByLabel('Store name')).toHaveValue('Ankito')
})

test('SEO, messages, plan, help, promotions and more pages', async ({ page, a11y }) => {
  await signedIn(page)
  await page.goto('/admin/seo')
  await a11y()
  await page.getByLabel('Google Analytics 4 Measurement ID').fill('UA-1')
  await page.getByRole('button', { name: 'Save' }).click()
  await alert(page, 'Please check the highlighted fields.')
  await page.getByLabel('Google Analytics 4 Measurement ID').fill('G-7Q2XK1PL0Z')
  await page.getByLabel('Site title template').fill('%s | Ankito')
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)
  await page.reload()
  await page.getByLabel('Google Analytics 4 Measurement ID').fill('')
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)
  await expect(page.getByText('SEO Pro audit')).toBeVisible()

  await page.goto('/admin/messages')
  await page.getByLabel('SMS code').check()
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)
  await page.reload()
  await expect(page.getByLabel('SMS code')).toBeChecked()

  await page.goto('/admin/plan')
  await a11y()
  await expect(page.getByTestId('feature-removeBranding')).toContainText('Premium')
  await expect(page.getByRole('link', { name: 'Unlock — contact Root Logic Lab' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/\d+$/,
  )

  await page.goto('/admin/help')
  await page.getByRole('link', { name: 'Create a category' }).click()
  await expect(page).toHaveURL(/categories/)
  await page.goto('/admin/promotions')
  await expect(page.getByText('Banners, posters and promo videos')).toBeVisible()
  await page.goto('/admin/more')
  await page.getByRole('link', { name: 'Help center' }).last().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Help center' })).toBeVisible()
  await page.goto('/admin/orders?status=PENDING&q=017')
  await expect(page.getByText('No orders here yet.')).toBeVisible()
})
