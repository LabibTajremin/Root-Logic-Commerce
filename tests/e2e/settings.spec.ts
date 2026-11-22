import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { e2eEnv } from '../../scripts/e2e-env.mjs'
import { signedIn } from './admin'
import { createProduct, editProduct, fillCheckout, photo, uid, uploadPhoto } from './shop'

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
  test.setTimeout(120_000) // every theme × four pages, each audited by axe
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  const id = uid()
  await signedIn(page)
  await createProduct(page, { name: `Sale ${id}`, price: '100', compareAt: '150', stock: '4' })
  await editProduct(page, `Sale ${id}`)
  await uploadPhoto(page)
  await createProduct(page, { name: `Out ${id}`, price: '100', stock: '0' })
  for (const theme of ['organic', 'attar', 'ankito', 'attar-aloy', 'minimal']) {
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
  await page.getByLabel('Show the shop name as logo text').uncheck()
  await page.getByLabel('Show the shop name as logo text').check()
  await page.getByLabel('Name font').selectOption('dm-serif-display')
  await page.getByLabel('Site font').selectOption('dm-sans')
  await page.locator('#color-button').fill('#3c6430')
  await page.locator('#color-header').fill('#fbf8f2')
  await page.getByLabel('Mode').selectOption('dark')
  await page.getByLabel('Mode').selectOption('light')
  await page.getByLabel(/^Light background/).fill('20')
  await page.getByLabel(/^Warm/).fill('30')
  await page.getByLabel(/^Dark background/).fill('100')
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
  await expect(page.getByRole('heading', { level: 1, name: 'Promotions' })).toBeVisible()
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
  await page.goto('/admin/plan')
  await page.getByTestId('feature-ga4InAdmin').getByRole('button', { name: 'Grant' }).click()
  await expect(page.getByTestId('feature-ga4InAdmin')).toContainText('Included')
  await page.goto('/admin')
  await expect(page.getByText('Included in your plan')).toBeVisible()
  await page.goto('/admin/plan')
  await page.getByTestId('feature-ga4InAdmin').getByRole('button', { name: 'Revoke' }).click()
  await expect(page.getByTestId('feature-ga4InAdmin')).toContainText('Premium')
})

test('features: owner switches modules; paid ones stay locked until SUPER_ADMIN grants them', async ({
  page,
  a11y,
}) => {
  await signedIn(page)
  await page.goto('/admin/features')
  await expect(page.getByRole('heading', { level: 1, name: 'Features' })).toBeVisible()
  await a11y()
  const coupons = page.getByTestId('module-coupons')
  await expect(coupons).toContainText('On')
  await coupons.getByRole('button', { name: 'Turn off' }).click()
  await expect(coupons).toContainText('Off')
  await coupons.getByRole('button', { name: 'Turn on' }).click()
  await expect(coupons).toContainText('On')
  await expect(page.getByTestId('module-reels')).toContainText('Premium')
  await expect(page.getByTestId('module-reels').getByRole('link')).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/\d+$/,
  )

  await page.context().clearCookies()
  await signedIn(page, e2eEnv.BOOTSTRAP_SUPER_EMAIL, e2eEnv.BOOTSTRAP_SUPER_PASSWORD)
  await page.goto('/admin/plan')
  await page.getByTestId('feature-reels').getByRole('button', { name: 'Grant' }).click()
  await expect(page.getByTestId('feature-reels')).toContainText('Included')
  await page.goto('/admin/features')
  const reels = page.getByTestId('module-reels')
  await expect(reels).toContainText('Off')
  await reels.getByRole('button', { name: 'Turn on' }).click()
  await expect(reels).toContainText('On')
  await reels.getByRole('button', { name: 'Turn off' }).click()
  await expect(reels).toContainText('Off')
  await page.goto('/admin/plan')
  await page.getByTestId('feature-reels').getByRole('button', { name: 'Revoke' }).click()
  await expect(page.getByTestId('feature-reels')).toContainText('Premium')
})

test('layouts: owner previews a niche layout privately, then switches the home page', async ({
  page,
  a11y,
}) => {
  await signedIn(page)
  await page.goto('/admin/layouts')
  await expect(page.getByRole('heading', { level: 1, name: 'Layout gallery' })).toBeVisible()
  await expect(page.getByTestId('layout-general')).toContainText('In use')
  await a11y()
  const fashion = page.getByTestId('layout-fashion')
  await fashion
    .locator('input[name="preset"]')
    .first()
    .evaluate((el) => {
      ;(el as HTMLInputElement).value = 'nope'
    })
  await fashion.getByRole('button', { name: 'Preview' }).click()
  await alert(page, 'That layout does not exist.')

  await page.getByTestId('layout-gadget').getByRole('button', { name: 'Preview' }).click()
  await page.waitForURL((u) => u.pathname === '/')
  const banner = page.getByRole('status').filter({ hasText: 'Only you see this' })
  await expect(banner).toContainText('Gadgets')
  await expect(page.locator('a[href="#products"]')).toHaveCount(0)
  await a11y()
  await banner.getByRole('button', { name: 'Exit preview' }).click()
  await page.waitForURL(/\/admin\/layouts$/)
  await page.goto('/')
  await expect(page.getByText('Only you see this')).toHaveCount(0)
  await expect(page.locator('a[href="#products"]')).toHaveCount(1)

  await page.goto('/admin/layouts')
  await page.getByTestId('layout-grocery').getByRole('button', { name: 'Use this layout' }).click()
  await expect(page.getByTestId('layout-grocery')).toContainText('In use')
  await page.goto('/')
  await expect(page.locator('a[href="#products"]')).toHaveCount(0)

  await page.goto('/admin/layouts')
  await page.getByTestId('layout-general').getByRole('button', { name: 'Use this layout' }).click()
  await expect(page.getByTestId('layout-general')).toContainText('In use')

  // Any section can be switched off and back on.
  const grid = page.getByTestId('section-product-grid')
  await grid.getByRole('button', { name: 'Turn off' }).click()
  await expect(grid).toContainText('Off')
  await page.goto('/')
  await expect(page.locator('#products')).toHaveCount(0)
  await page.goto('/admin/layouts')
  await page.getByTestId('section-product-grid').getByRole('button', { name: 'Turn on' }).click()
  await expect(page.getByTestId('section-product-grid')).toContainText('On')
  await page.goto('/')
  await expect(page.locator('#products')).toHaveCount(1)
})

test('language texts: owner picks the shop language, rewords labels and turns on Bangla digits', async ({
  page,
  a11y,
}) => {
  const save = async () => {
    await page.getByRole('button', { name: 'Save' }).click()
    await saved(page)
  }
  await signedIn(page)
  await page.goto('/admin/texts')
  await expect(page.getByRole('heading', { level: 1, name: 'Language texts' })).toBeVisible()
  await a11y()
  const cart = page.getByTestId('text-shop.cart')
  await cart.getByRole('textbox').nth(1).fill('ঝুড়ি')
  await page.getByLabel('Bangla', { exact: true }).check()
  await page.getByLabel('Let shoppers switch between English and Bangla').uncheck()
  await page.getByLabel(/Bangla digits/).check()
  await page.getByLabel('Currency sign').selectOption('USD')
  await page.getByLabel('Date format').selectOption('yyyy-MM-dd')
  await save()

  await page.context().clearCookies()
  await page.goto('/')
  await expect(page.getByRole('button', { name: /^ঝুড়ি/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Language' })).toHaveCount(0)
  await expect(page.getByText(/^\$[০-৯]/).first()).toBeVisible()
  await a11y()

  // The shop now opens in Bangla; pick English like an owner would before signing in.
  await page.goto('/admin/lang?to=en&back=/admin/login')
  await signedIn(page)
  await page.goto('/admin/texts')
  await page.getByTestId('text-shop.cart').getByRole('textbox').nth(1).fill('')
  await page.getByLabel('English', { exact: true }).check()
  await page.getByLabel('Let shoppers switch between English and Bangla').check()
  await page.getByLabel(/Bangla digits/).uncheck()
  await page.getByLabel('Currency sign').selectOption('BDT')
  await page.getByLabel('Date format').selectOption('d MMM yyyy')
  await save()
  await page.context().clearCookies()
  await page.goto('/')
  await expect(page.getByRole('button', { name: /^Cart/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Language' })).toBeVisible()
})

test('pages: owner adds standard pages, writes a draft, publishes it and it shows in the footer', async ({
  page,
  a11y,
}) => {
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  await signedIn(page)
  await page.goto('/admin/pages')
  await expect(page.getByRole('heading', { level: 1, name: 'Pages' })).toBeVisible()
  await a11y()
  await page.getByRole('button', { name: 'Add standard pages' }).click()
  await expect(page.getByTestId('page-return-policy')).toContainText('Live')
  await expect(page.getByTestId('page-about')).toBeVisible()

  // Same web address as an existing page.
  await page.getByLabel('Page title').fill('Copy')
  await page.getByLabel('Web address').fill('about')
  await page.getByRole('button', { name: 'Save' }).click()
  await alert(page, 'Another page already uses that web address.')

  await page.getByLabel('Page title').fill('Size guide')
  await page.getByLabel('Web address').fill('size-guide')
  await page
    .getByLabel('Text')
    .fill('## Measure\n\nUse a **soft tape**.\n\n- Chest\n- Length\n\n### Still unsure?\n\nAsk us.')
  await page.getByLabel('Show on the shop').uncheck()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('page-size-guide')).toContainText('Draft')
  const missing = await page.goto('/page/size-guide')
  expect(missing?.status()).toBe(404)

  await page.goto('/admin/pages')
  await page.getByTestId('page-size-guide').getByRole('link').click()
  await expect(page.getByRole('heading', { name: 'Edit page' })).toBeVisible()
  await page.getByLabel('Show on the shop').check()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('page-size-guide')).toContainText('Live')

  await page.goto('/')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Size guide' }).click()
  await page.waitForURL(/\/page\/size-guide$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Size guide' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Measure' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Still unsure?' })).toBeVisible()
  await expect(page.locator('strong', { hasText: 'soft tape' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Chest' })).toBeVisible()
  await a11y()

  await page.goto('/admin/pages')
  await page.getByTestId('page-size-guide').getByRole('link').click()
  await page.getByLabel('Yes, delete this page').check()
  await page.getByRole('button', { name: 'Delete page' }).click()
  await expect(page.getByTestId('page-size-guide')).toHaveCount(0)
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
  await page.getByRole('combobox', { name: 'Language' }).selectOption('bn')
  await page.getByRole('button', { name: 'View' }).click()
  await page.waitForURL(/lang=bn/)
  await expect(page.getByLabel('SMS / WhatsApp text')).toHaveValue(/পেয়েছি/)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('en')
  await page.getByRole('button', { name: 'View' }).click()
  await page.waitForURL(/lang=en/)
  await expect(page.getByLabel('SMS / WhatsApp text')).toHaveValue(/We will call to confirm/)
  await page.waitForLoadState('networkidle')
  const custom = 'Thanks! Order #{{orderNo}} ({{total}}) is in. — {{store}}'
  await page.getByLabel('SMS / WhatsApp text').fill(custom)
  await page.getByRole('button', { name: 'Save' }).last().click()
  // Several forms show "Saved" on this page: confirm this one by reloading.
  await expect(async () => {
    await page.reload()
    await expect(page.getByLabel('SMS / WhatsApp text')).toHaveValue(custom, { timeout: 500 })
  }).toPass()

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

test('insights: GA4 ecommerce events, first-party counts and the dashboard ranges', async ({
  page,
  a11y,
}) => {
  const name = `Stat ${uid()}`
  await signedIn(page)
  await page.goto('/admin/seo')
  await page.getByLabel('Google Analytics 4 Measurement ID').fill('G-TEST12345')
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)
  await createProduct(page, { name, price: '300', stock: '9' })

  await page.goto(`/search?q=${encodeURIComponent(name)}`)
  await page.getByRole('link', { name }).first().click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  await page.getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)
  await fillCheckout(page)
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)
  const events = await page.evaluate(() =>
    (window.dataLayer ?? [])
      .map((a) => (a as unknown[])[0] === 'event' && (a as unknown[])[1])
      .filter(Boolean),
  )
  expect(events).toEqual(
    expect.arrayContaining(['view_item', 'add_to_cart', 'begin_checkout', 'purchase']),
  )
  await expect(
    page.locator('script[src*="googletagmanager.com/gtag/js?id=G-TEST12345"]'),
  ).toBeAttached({ timeout: 5000 })
  const no = (await page.getByTestId('order-no').textContent())!.replace('#', '')
  expect((await page.request.post('/api/beacon', { data: 'not-a-path' })).status()).toBe(204)

  await page.goto(`/admin/orders?q=${no}`)
  await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
  for (const step of ['Confirm order', 'Start processing', 'Mark shipped', 'Mark delivered']) {
    await page.getByRole('button', { name: step }).click()
    await expect(page.getByRole('button', { name: step })).toHaveCount(0)
  }
  await page.goto('/admin?range=today')
  await expect(page.getByTestId('insight-visitors')).not.toHaveText('0')
  await expect(page.getByTestId('insight-ordersDelivered')).not.toHaveText('0')
  await expect(page.getByTestId('top-products')).toContainText(name)
  await a11y()
  for (const range of ['7d', '12m']) {
    await page.getByRole('combobox', { name: 'Period' }).selectOption(range)
    await page.getByRole('button', { name: 'View' }).click()
    await expect(page).toHaveURL(new RegExp(`range=${range}`))
  }
  await page.goto('/admin?range=custom&from=2026-01-10&to=2026-01-01')
  await expect(page.getByRole('alert').filter({ hasText: 'Those dates don’t work' })).toBeVisible()
  await page.goto('/admin?range=custom&from=2020-01-01&to=2020-01-03&group=week')
  await expect(page.getByTestId('insights-range')).toHaveText('2020-01-01 → 2020-01-03')
  await expect(page.getByText('No sales in this period yet.')).toBeVisible()

  await page.goto('/admin/seo')
  await page.getByLabel('Google Analytics 4 Measurement ID').fill('')
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)
})

test('promotions: every banner kind, the video lock, embeds that load on tap, and video ranges', async ({
  page,
  a11y,
}) => {
  test.info().annotations.push({ type: 'allow-status', description: '416' })
  const id = uid()
  await signedIn(page, e2eEnv.BOOTSTRAP_SUPER_EMAIL, e2eEnv.BOOTSTRAP_SUPER_PASSWORD)
  await createProduct(page, { name: `Pick ${id}`, price: '100', stock: '3' })
  await editProduct(page, `Pick ${id}`)
  await uploadPhoto(page)
  await createProduct(page, { name: `Plain ${id}`, price: '90', stock: '3' })
  const add = async (kind: string, fill: () => Promise<void>) => {
    await page.goto(`/admin/promotions?kind=${kind}`)
    await fill()
    await page.getByRole('button', { name: 'Add banner' }).click()
    await saved(page)
  }
  await page.goto('/admin/promotions')
  await expect(page.getByText('No banners yet')).toBeVisible()
  await a11y()
  await add('poster', async () => {
    await page.getByLabel('Headline').fill(`Eid ${id}`)
    await page.getByLabel('Sub-text').fill('Up to 20% off')
    await page.getByLabel('Button text').fill('Shop now')
    await page.getByLabel('Button link (e.g. /c/tea or https://…)').fill('/search')
  })
  await add('poster', async () => {
    await page.getByLabel('Background image (optional)').setInputFiles(await photo('#a8763e'))
    await page.getByLabel('Headline').fill(`Puja ${id}`)
  })
  await add('images', async () => {
    await page.getByLabel('Images').setInputFiles([await photo('#123456'), await photo('#654321')])
    await page.getByLabel('Promo message').fill(`New in ${id}`)
    await page.getByLabel('Button text').fill('See all')
  })
  await add('products', async () => {
    await page.getByLabel(`Pick ${id}`).check()
    await page.getByLabel(`Plain ${id}`).check()
    await page.getByLabel('Promo message').fill(`Picks ${id}`)
    await page.getByLabel('Button text').fill('Buy')
  })
  await add('embed', async () => {
    await page.getByLabel('Video link').fill('https://youtu.be/dQw4w9WgXcQ')
    await page.getByLabel('Caption').fill(`Story ${id}`)
  })
  await add('embed', async () => {
    await page.getByLabel('Video link').fill('https://www.instagram.com/reel/Cx1Yz/')
  })
  await page.goto('/admin/promotions?kind=embed')
  await page.getByLabel('Video link').fill('https://vimeo.com/1')
  await page.getByRole('button', { name: 'Add banner' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Please check the highlighted fields.' }),
  ).toBeVisible()

  await page.goto('/admin/promotions?kind=video')
  await expect(page.getByText('Premium').first()).toBeVisible()
  // The lock is enforced on the server too: a tampered form is refused.
  await page.goto('/admin/promotions?kind=embed')
  await page.locator('input[name="kind"]').evaluate((e: HTMLInputElement) => (e.value = 'video'))
  await page.getByLabel('Video link').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Add banner' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'This is a premium feature' }),
  ).toBeVisible()
  await page.goto('/admin/plan')
  await page.getByTestId('feature-videoUploads').getByRole('button', { name: 'Grant' }).click()
  await expect(page.getByTestId('feature-videoUploads')).toContainText('Included')
  const mp4 = Buffer.concat([
    Buffer.from([0, 0, 0, 0x18]),
    Buffer.from('ftypisom'),
    Buffer.alloc(52, 1),
  ])
  await add('video', async () => {
    await page
      .getByLabel('Video file')
      .setInputFiles({ name: 'promo.mp4', mimeType: 'video/mp4', buffer: mp4 })
    await page.getByLabel('Caption').fill(`Watch ${id}`)
  })
  await page.goto('/admin/plan')
  await page.getByTestId('feature-videoUploads').getByRole('button', { name: 'Revoke' }).click()
  await expect(page.getByTestId('feature-videoUploads')).toContainText('Premium')

  await page.goto('/')
  const promos = page.getByRole('region', { name: 'Promotions' })
  for (const text of [
    `Eid ${id}`,
    `Puja ${id}`,
    `New in ${id}`,
    `Picks ${id}`,
    `Story ${id}`,
    `Watch ${id}`,
  ])
    await expect(promos).toContainText(text)
  await a11y()
  await promos.getByRole('button', { name: `Play video: Story ${id}` }).click()
  await expect(
    promos.locator('iframe[src^="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]'),
  ).toBeAttached()
  const src = (await promos.locator('video').getAttribute('src'))!
  const part = await page.request.get(src, { headers: { range: 'bytes=0-3' } })
  expect(part.status()).toBe(206)
  expect(part.headers()['content-range']).toBe(`bytes 0-3/${mp4.length}`)
  expect((await page.request.get(src, { headers: { range: 'bytes=9999-' } })).status()).toBe(416)
  expect((await page.request.get(src)).status()).toBe(200)

  await page.goto('/admin/promotions')
  const row = (text: string) => page.getByTestId('banner-row').filter({ hasText: text })
  await row(`Puja ${id}`).getByRole('button', { name: 'Hide' }).click()
  await expect(row(`Puja ${id}`)).toContainText('Hidden')
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Promotions' })).not.toContainText(`Puja ${id}`)
  await page.goto('/admin/promotions')
  await row(`Puja ${id}`).getByRole('button', { name: 'Show' }).click()
  await expect(row(`Puja ${id}`)).toContainText('Showing')
  const grip = (await page
    .getByRole('listitem')
    .filter({ hasText: `Puja ${id}` })
    .getByRole('button', { name: 'Drag to reorder' })
    .boundingBox())!
  const first = (await page
    .getByRole('listitem')
    .filter({ hasText: `Eid ${id}` })
    .boundingBox())!
  const reordered = page.waitForResponse((r) => r.request().method() === 'POST')
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + grip.width / 2, first.y + first.height / 2, { steps: 12 })
  await page.mouse.up()
  expect((await reordered).ok()).toBe(true)
  // Leave the home page clean for whatever runs next.
  while ((await page.getByTestId('banner-row').count()) > 0) {
    const n = await page.getByTestId('banner-row').count()
    await page.getByTestId('banner-row').first().getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByTestId('banner-row')).toHaveCount(n - 1)
  }
  await expect(page.getByText('No banners yet')).toBeVisible()
})
