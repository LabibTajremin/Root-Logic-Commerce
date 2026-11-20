import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { e2eEnv } from '../../scripts/e2e-env.mjs'
import { signedIn } from './admin'
import { createProduct, editProduct, fillCheckout, uid, uploadPhoto } from './shop'

test.describe.configure({ mode: 'serial' })

const alert = (page: Page, text: string | RegExp) =>
  expect(page.getByRole('alert').filter({ hasText: text })).toBeVisible()
const lastCode = (to: string) => {
  const lines = readFileSync('.e2e/notify.log', 'utf8').trim().split('\n')
  const mine = lines
    .map((l) => JSON.parse(l) as { to: string; text: string })
    .filter((m) => m.to === to)
  return /code is (\d{6})/.exec(mine.at(-1)!.text)![1]!
}
const saved = (page: Page) =>
  expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
const otpToggles = async (page: Page, sms: boolean, email: boolean) => {
  await page.goto('/admin/messages')
  await page.getByLabel('SMS code').setChecked(sms)
  await page.getByLabel('Email code').setChecked(email)
  await page.getByRole('button', { name: 'Save' }).first().click()
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
}
const cartWith = async (page: Page, name: string) => {
  await page.goto(`/search?q=${encodeURIComponent(name)}`)
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.getByRole('dialog', { name: 'Cart' }).getByRole('link', { name: 'Checkout' }).click()
  await page.waitForURL(/\/checkout$/)
}

test('checkout asks for an SMS, then an email code when the owner turns OTP on', async ({
  page,
  a11y,
}) => {
  const id = uid()
  const phone = `017${String(Date.now()).slice(-8)}`
  await signedIn(page)
  await createProduct(page, { name: `Otp ${id}`, price: '100', stock: '9' })
  await otpToggles(page, true, false)
  await page.reload()
  await expect(page.getByLabel('SMS code')).toBeChecked()

  await cartWith(page, `Otp ${id}`)
  await fillCheckout(page, phone)
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page.getByText(`We sent a 6-digit code to •••••••${phone.slice(-3)}`)).toBeVisible()
  await a11y()
  await page.getByLabel('Verification code').fill('000000')
  await page.getByRole('button', { name: 'Verify & place order' }).click()
  await alert(page, 'That code is not right. Please try again.')
  await page.getByLabel('Verification code').fill(lastCode(phone))
  await page.getByRole('button', { name: 'Verify & place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)

  await otpToggles(page, false, true)
  await cartWith(page, `Otp ${id}`)
  await fillCheckout(page, phone)
  await page.getByRole('button', { name: 'Place order' }).click()
  await alert(page, 'Please enter your email')
  await page.getByLabel('Email (optional)').fill(`Shopper.${id}@Example.com`)
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page.getByText('We sent a 6-digit code to s***@example.com')).toBeVisible()
  await page.getByLabel('Verification code').fill(lastCode(`shopper.${id}@example.com`))
  await page.getByRole('button', { name: 'Verify & place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)
  await otpToggles(page, false, false)
})

test('every theme renders the storefront accessibly', async ({ page, a11y }) => {
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  const id = uid()
  await signedIn(page)
  await createProduct(page, { name: `Sale ${id}`, price: '100', compareAt: '150', stock: '4' })
  await editProduct(page, `Sale ${id}`)
  await uploadPhoto(page)
  await createProduct(page, { name: `Out ${id}`, price: '100', stock: '0' })
  for (const theme of ['organic', 'attar', 'ankito', 'minimal']) {
    await page.goto('/admin/design')
    await page.getByLabel('Theme').selectOption(theme)
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible()
    await page.goto(`/search?q=${encodeURIComponent(id)}`)
    await expect(page.getByRole('link', { name: `Sale ${id}` })).toBeVisible()
    await expect(page.getByText('Sold out')).toBeVisible()
    await a11y()
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await a11y()
    await page
      .getByRole('link', { name: `Sale ${id}` })
      .first()
      .click()
    await expect(page.getByRole('heading', { level: 1, name: `Sale ${id}` })).toBeVisible()
    await a11y()
    await page.goto('/missing-page')
    await a11y()
  }
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

  // Someone publishes from another tab: this editor is now stale and must not overwrite.
  const other = await page.context().newPage()
  await other.goto('/admin/design')
  await other.getByLabel('Footer text').fill('v2')
  await other.getByRole('button', { name: 'Publish' }).click()
  await expect(other.getByRole('status').filter({ hasText: 'Published' })).toBeVisible()
  await other.close()
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Settings were changed elsewhere' }),
  ).toBeVisible()
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
  await page.goto('/admin/orders?status=PENDING&q=0199999')
  await expect(page.getByText('No orders here yet.')).toBeVisible()
})

test('SUPER_ADMIN grants and revokes a premium feature; owners only see locks', async ({
  page,
}) => {
  await signedIn(page, e2eEnv.BOOTSTRAP_SUPER_EMAIL, e2eEnv.BOOTSTRAP_SUPER_PASSWORD)
  await page.goto('/admin/plan')
  const feature = page.getByTestId('feature-removeBranding')
  await feature.getByRole('button', { name: 'Grant' }).click()
  await expect(feature).toContainText('Included')
  await page.goto('/')
  await expect(page.getByText('Powered by © Root Logic Lab')).toHaveCount(0)
  await page.goto('/admin/plan')
  await feature.getByRole('button', { name: 'Revoke' }).click()
  await expect(feature).toContainText('Premium')
  await page.goto('/')
  await expect(page.getByText('Powered by © Root Logic Lab')).toBeVisible()
})

test('messages: channels, templates, and the outbox sends order updates via the cron route', async ({
  page,
  a11y,
}) => {
  test.info().annotations.push({ type: 'allow-status', description: '401' })
  const id = uid()
  await signedIn(page)
  await page.goto('/admin/messages')
  await page.getByLabel('Owner phone (SMS/WhatsApp)').fill('01811111111')
  await page.getByRole('group', { name: 'SMS gateway' }).getByLabel('Send on this channel').check()
  await page
    .getByLabel('Gateway URL')
    .fill('https://sms.example/send?to={{to}}&text={{text}}&key={{apiKey}}')
  await page.getByLabel('API key').fill('secret-key-1')
  await page.getByRole('button', { name: 'Save' }).nth(1).click()
  await saved(page)
  await page.reload()
  await expect(page.getByLabel('API key')).toHaveAttribute(
    'placeholder',
    'Saved — leave blank to keep it',
  )
  await expect(page.getByLabel('API key')).toHaveValue('')
  await page.getByLabel('Sender ID / mask').fill('SHOP')
  await page.getByRole('button', { name: 'Save' }).nth(1).click()
  await saved(page)
  await a11y()

  await page.getByRole('combobox', { name: 'When' }).selectOption('order.placed')
  await page.getByRole('combobox', { name: 'Language' }).selectOption('en')
  await page.getByRole('button', { name: 'View' }).click()
  await page
    .getByLabel('SMS / WhatsApp text')
    .fill('Thanks! Order #{{orderNo}} ({{total}}) is in. — {{store}}')
  await page.getByRole('button', { name: 'Save' }).last().click()
  await saved(page)

  await createProduct(page, { name: `Msg ${id}`, price: '200', stock: '5' })
  await cartWith(page, `Msg ${id}`)
  await fillCheckout(page)
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)
  const no = (await page.getByTestId('order-no').textContent())!.replace('#', '')

  expect((await page.request.get('/api/cron/outbox')).status()).toBe(401)
  const run = await page.request.get('/api/cron/outbox', {
    headers: { authorization: `Bearer ${e2eEnv.CRON_SECRET}` },
  })
  expect(await run.json()).toMatchObject({ failed: 0 })
  const log = readFileSync('.e2e/notify.log', 'utf8')
  expect(log).toContain(`Thanks! Order #${no} (৳260) is in.`)
  expect(log).toContain(`New order #${no}`)
  await page.goto('/admin/messages')
  await expect(page.getByTestId('outbox')).toContainText(`Order #${no}`)
  await expect(page.getByTestId('outbox').getByText('Sent').first()).toBeVisible()
  await page
    .getByRole('group', { name: 'SMS gateway' })
    .getByLabel('Send on this channel')
    .uncheck()
  await page.getByRole('button', { name: 'Save' }).nth(1).click()
  await saved(page)
})
