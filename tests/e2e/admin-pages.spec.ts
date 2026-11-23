import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { signedIn } from './admin'
import { createProduct, fillCheckout, slug } from './shop'

const uid = () => `${test.info().project.name}-${Date.now().toString(36)}`
const saved = (page: Page) =>
  expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
const alert = (page: Page, text: string | RegExp) =>
  expect(page.getByRole('alert').filter({ hasText: text })).toBeVisible()
/** Pointer-drags a row onto its neighbour (below if it is first, else above); waits for the save. */
const drag = async (page: Page, row: string) => {
  const item = page.getByRole('listitem').filter({ hasText: row }).first()
  const first = await item.evaluate((li) => li.previousElementSibling === null)
  const target = item.locator(
    first ? 'xpath=following-sibling::li[1]' : 'xpath=preceding-sibling::li[1]',
  )
  const from = (await item.getByRole('button', { name: 'Drag to reorder' }).boundingBox())!
  const to = (await target.boundingBox())!
  const saved = page.waitForResponse((r) => r.request().method() === 'POST')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()
  expect((await saved).ok()).toBe(true)
}

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

  await drag(page, `Oil ${id}`)

  await page.getByRole('link', { name: `Oil ${id}` }).click()
  await expect(page.getByLabel('Category name')).toHaveValue(`Oil ${id}`)
  // The reorder's refresh can re-render the form late and undo the tamper.
  await page.waitForLoadState('networkidle')
  // A tampered id is an unexpected failure: a retry hint, never a 500.
  const hiddenId = page.locator('input[name="id"]').first()
  await hiddenId.evaluate((e: HTMLInputElement) => (e.value = 'x'))
  await expect(hiddenId).toHaveValue('x')
  await page.getByRole('button', { name: 'Archive' }).click()
  await alert(page, 'Something went wrong. Please try again.')
  await page.reload()
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
  await expect(page).toHaveTitle(/New product/)
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
  await drag(page, `Bowl ${id}`)
  // Picked up and dropped in place: nothing to save.
  const grip = (await page
    .getByRole('listitem')
    .filter({ hasText: `Bowl ${id}` })
    .first()
    .getByRole('button', { name: 'Drag to reorder' })
    .boundingBox())!
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 + 3, { steps: 3 })
  await page.mouse.up()
  await expect(page.locator('li[data-dragging="true"]')).toHaveCount(0)

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
  for (const p of [
    '/admin/design',
    '/admin/seo',
    '/admin/messages',
    '/admin/promotions',
    '/admin/features',
    '/admin/layouts',
    '/admin/layouts/switch?preset=general',
    '/admin/texts',
    '/admin/pages',
    '/admin/activity',
    '/admin/store',
  ]) {
    await staff.goto(p)
    await expect(staff.getByText('Only the store owner can do this.')).toBeVisible()
  }
  await staff.close()
})

test('admin shell: Simple/Pro menu and ⌘K finds screens, orders and products', async ({
  page,
  a11y,
}) => {
  const id = uid()
  const phone = `0171${String(Date.now()).slice(-7)}`
  await signedIn(page)
  await createProduct(page, { name: `Find ${id}`, price: '250', stock: '5' })
  await page.goto(`/p/${slug(`Find ${id}`)}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)
  await fillCheckout(page, phone)
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)

  // Simple is the default: advanced screens stay out of the sidebar but remain in More.
  const side = (href: string) => page.locator(`nav[aria-label="Admin"] a[href="${href}"]`)
  await page.goto('/admin')
  await expect(side('/admin/features')).toHaveCount(0)
  await expect(side('/admin/orders')).toHaveCount(1)
  await page.goto('/admin/mode?to=pro&back=/admin/orders')
  await page.waitForURL(/\/admin\/orders$/)
  await expect(side('/admin/features')).toHaveCount(1)
  await page.goto('/admin/mode?to=nope&back=//evil.example')
  await page.waitForURL(/\/admin$/)
  await expect(side('/admin/features')).toHaveCount(1)
  await page.goto('/admin/mode?to=simple')
  await page.waitForURL(/\/admin$/)
  await expect(side('/admin/features')).toHaveCount(0)
  await page.goto('/admin/more')
  await expect(page.getByRole('link', { name: 'Features' })).toBeVisible()

  // ⌘K: keyboard shortcut, then the header button.
  await page.goto('/admin')
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: 'Search orders, products, menus…' })
  await expect(dialog).toBeVisible()
  const box = dialog.getByRole('textbox')
  await box.fill('Pages')
  await expect(
    dialog.getByRole('region', { name: 'Screens' }).getByRole('link', { name: /Pages/ }),
  ).toBeVisible()
  await a11y()
  await box.fill('z')
  await box.fill('zzzz-no-match')
  await expect(dialog.getByText('Nothing found yet')).toBeVisible()
  await box.fill(phone)
  const order = dialog.getByRole('region', { name: 'Orders' }).getByRole('link')
  await expect(order).toHaveCount(1)
  // Open it from the palette and cancel it, so no stray pending order skews other tests' counts.
  await order.click()
  await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+$/)
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByTestId('order-events')).toContainText('Cancelled')
  await page.keyboard.press('Control+k')
  await box.fill(`Find ${id}`)
  const product = dialog
    .getByRole('region', { name: 'Products' })
    .getByRole('link', { name: `Find ${id}` })
  await product.click()
  await page.waitForURL(/\/admin\/products\/[0-9a-f-]+$/)
  await expect(dialog).toBeHidden()
  await page.keyboard.press('Shift+K')
  await page.getByRole('button', { name: 'Search orders, products, menus…' }).click()
  await expect(dialog).toBeVisible()
})

test('notifications: a new order rings the bell, shows a toast and lands in the centre', async ({
  page,
  a11y,
}) => {
  const id = uid()
  await signedIn(page)
  await createProduct(page, { name: `Bell ${id}`, price: '120', stock: '5' })
  const order = async () => {
    const shopper = await page.context().newPage()
    await shopper.goto(`/p/${slug(`Bell ${id}`)}`)
    await shopper.waitForLoadState('networkidle')
    await shopper.getByRole('button', { name: 'Order now' }).click()
    await shopper.waitForURL(/\/checkout$/)
    await fillCheckout(shopper, `0181${String(Date.now()).slice(-7)}`)
    await shopper.getByRole('button', { name: 'Place order' }).click()
    await shopper.waitForURL(/\/order\/\d+$/)
    const no = (await shopper.getByTestId('order-no').textContent())!.replace('#', '')
    await shopper.close()
    return no
  }
  // The bell also polls every 15 s; regaining focus checks right away.
  const ring = async (no: string) => {
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    const toast = page.getByRole('status').filter({ hasText: `New order #${no}` })
    await expect(toast).toBeVisible()
    return toast
  }
  const cancel = async () => {
    await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+$/)
    await page.getByRole('button', { name: 'Cancel order' }).click()
    await expect(page.getByTestId('order-events')).toContainText('Cancelled')
  }

  await page.goto('/admin/notifications')
  await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible()
  await a11y()
  const sound = page.getByLabel('Play a chime for new orders on this device')
  await sound.check()
  await sound.uncheck()

  const quiet = await order()
  await ring(quiet)
  await expect(page.getByTestId('bell-count')).not.toHaveText('0')
  await sound.check()
  const loud = await order()
  const toast = await ring(loud)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await toast.getByRole('link', { name: 'Open' }).click()
  await cancel()

  await page.goto('/admin/notifications')
  await page.getByTestId(`notice-${quiet}`).getByRole('link').click()
  await cancel()
  await page.goto('/admin/notifications')
  const notice = page.getByTestId(`notice-${loud}`)
  await notice.getByRole('button', { name: 'Mark read' }).click()
  await expect(notice).toContainText('Read')
  // Other tests may place orders meanwhile, so only this test's notices are asserted.
  await page.getByRole('button', { name: 'Mark all read' }).click()
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId(`notice-${quiet}`)).toContainText('Read')
})
