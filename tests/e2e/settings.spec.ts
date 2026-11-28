import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { e2eEnv } from '../../scripts/e2e-env.mjs'
import { signedIn } from './admin'
import { createProduct, editProduct, fillCheckout, photo, slug, uid, uploadPhoto } from './shop'

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
/** J3: "Use this layout" asks what happens to the products first. */
const useLayout = async (page: Page, preset: string, choice: string) => {
  await page.goto('/admin/layouts')
  await page.getByTestId(`layout-${preset}`).getByRole('link', { name: 'Use this layout' }).click()
  await expect(page.getByRole('heading', { level: 1, name: /^Switch to / })).toBeVisible()
  await page.getByRole('button', { name: choice }).click()
  await page.waitForURL(/\/admin\/layouts$/)
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
  await createProduct(page, {
    name: `Sale ${id}`,
    price: '100',
    compareAt: '150',
    stock: '4',
    badge: { text: 'Hot', tone: 'success' },
  })
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
    // A3/A4 on every theme's card: saving, the owner's badge, and low stock.
    await expect(page.getByText('Save 33%')).toBeVisible()
    await expect(page.getByText('Hot', { exact: true })).toBeVisible()
    await expect(page.getByText('Only 4 left')).toBeVisible()
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
  // Covers every editor setting plus a second publisher; the editor keeps growing.
  test.setTimeout(60_000)
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
  await page.getByLabel('Footer style').selectOption('centered')
  for (const l of ['categories', 'help links and pages', 'payment methods'])
    await page.getByLabel(`Footer: show ${l}`).uncheck()
  for (const l of [/^Show badges/, 'Show the old price', 'Show the Add to cart button'])
    await page.getByLabel(l).uncheck()
  await page.getByLabel('Per row (phone)').selectOption('1')
  await page.getByLabel('Per row (computer)').selectOption('5')
  await page.getByLabel('Picture shape').selectOption('4:5')
  // A carousel lays cards in one row; the per-row counts apply to the grid showcase.
  await page.getByLabel('Product showcase').selectOption('grid')
  await expect
    .poll(() => preview.locator('#rlc-preview').evaluate((e) => e.textContent))
    .toMatch(/--cols-mobile:1;--cols-desktop:5\}\.rlc-card \.rlc-media\{aspect-ratio:4\/5\}/)
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible()
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  await expect(footer).toHaveAttribute('data-footer', 'centered')
  await expect(footer.getByRole('navigation')).toHaveCount(0)
  await expect(page.getByTestId('footer-payments')).toHaveCount(0)
  await page.goto('/search?q=')
  const cards = page.locator('.rlc-card')
  await expect(cards.first()).toBeVisible()
  await expect(cards.getByRole('button', { name: 'Add to cart' })).toHaveCount(0)
  await expect(cards.locator('s')).toHaveCount(0)
  await expect(cards.getByText(/^Save \d+%$/)).toHaveCount(0)
  await expect(cards.first().locator('.rlc-media')).toHaveCSS('aspect-ratio', '4 / 5')
  const cols = await page
    .locator('.rlc-grid')
    .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length)
  expect(cols).toBe(page.viewportSize()!.width >= 768 ? 5 : 1)

  await page.goto('/admin/design')
  for (const l of ['categories', 'help links and pages', 'payment methods'])
    await page.getByLabel(`Footer: show ${l}`).check()
  await page.getByLabel('Footer style').selectOption('classic')
  for (const l of [/^Show badges/, 'Show the old price', 'Show the Add to cart button'])
    await page.getByLabel(l).check()
  await page.getByLabel('Per row (phone)').selectOption('2')
  await page.getByLabel('Per row (computer)').selectOption('4')
  await page.getByLabel('Picture shape').selectOption('theme')
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible()
  await page.goto('/')
  await expect(page.getByTestId('footer-payments')).toContainText('bKash')
  await page.goto('/search?q=')
  await expect(
    page.locator('.rlc-card').getByRole('button', { name: 'Add to cart' }).first(),
  ).toBeVisible()
  await page.goto('/admin/design')

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
  await useLayout(page, 'grocery', 'Switch, keep mine')
  await expect(page.getByTestId('layout-grocery')).toContainText('In use')
  await page.goto('/')
  await expect(page.locator('a[href="#products"]')).toHaveCount(0)

  await page.goto('/admin/layouts')
  await useLayout(page, 'general', 'Switch, keep mine')
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

test('logos: owner uploads a logo and favicon, links a footer logo from Drive, then removes them', async ({
  page,
  a11y,
}) => {
  // The fake Drive file has no thumbnail: its proxy answers 404 (as in the product images test).
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  await signedIn(page)
  await page.goto('/admin/design')
  await expect(page.getByRole('heading', { name: 'Logos & icon' })).toBeVisible()
  await a11y('iframe')
  const slot = (s: string) => page.getByTestId(`brand-${s}`)
  for (const s of ['logo', 'favicon']) {
    await slot(s)
      .getByLabel('Choose a photo')
      .setInputFiles(await photo('#a8763e'))
    await slot(s).getByRole('button', { name: 'Upload image' }).click()
    await expect(slot(s).getByRole('button', { name: 'Remove' })).toBeVisible()
  }
  await slot('footerLogo')
    .getByLabel(/Google Drive/)
    .fill('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing')
  await slot('footerLogo').getByRole('button', { name: 'Add' }).click()
  await expect(slot('footerLogo').getByRole('button', { name: 'Remove' })).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('banner').locator('img[src*="/api/media/"]')).toHaveCount(1)
  await expect(page.getByRole('contentinfo').locator('img[src*="/api/media/"]')).toHaveCount(1)
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute('href', /\/api\/media\//)
  await a11y()

  await page.goto('/admin/design')
  for (const s of ['logo', 'favicon', 'footerLogo']) {
    await slot(s).getByRole('button', { name: 'Remove' }).click()
    await expect(slot(s).getByRole('button', { name: 'Remove' })).toHaveCount(0)
  }
})

test('activity log: a design change is logged with who and where, filtered, and undone', async ({
  page,
  a11y,
}) => {
  await signedIn(page)
  await page.goto('/admin/design')
  const footer = page.getByLabel('Footer text')
  const before = await footer.inputValue()
  await footer.fill('Logged change')
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible()

  await page.goto('/admin/activity')
  await expect(page.getByRole('heading', { level: 1, name: 'Activity log' })).toBeVisible()
  await a11y()
  const row = page.getByTestId('activity-row').first()
  await expect(row).toContainText('Design changed')
  await expect(row).toContainText('footer.text')
  // Logged against the signed-in owner, not "System".
  await expect(row).toContainText(e2eEnv.BOOTSTRAP_OWNER_NAME)

  const chips = page.getByRole('navigation', { name: 'Filter by change' })
  await chips.getByRole('link', { name: /^Design changed/ }).click()
  await page.waitForURL(/action=settings\.design/)
  await page.getByLabel('Who').selectOption({ label: e2eEnv.BOOTSTRAP_OWNER_NAME })
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
  await page.getByLabel('From', { exact: true }).fill(today)
  await page.getByLabel('To', { exact: true }).fill(today)
  await page.getByLabel('Search', { exact: true }).fill('design')
  await page.getByRole('button', { name: 'Apply' }).click()
  await page.waitForURL(/q=design/)
  await expect(page.getByTestId('activity-row').first()).toContainText('Design changed')
  await chips.getByRole('link', { name: /^All/ }).click()
  await page.waitForURL((u) => !u.searchParams.has('action'))

  await page
    .getByTestId('activity-row')
    .first()
    .getByRole('button', { name: 'Undo this change' })
    .click()
  await expect(page.getByTestId('activity-row').filter({ hasText: 'Undone' }).first()).toBeVisible()
  await page.goto('/admin/design')
  await expect(page.getByLabel('Footer text')).toHaveValue(before)
})

test('activity log: product added and changed are logged; a product change is undone (F3)', async ({
  page,
}) => {
  const name = `Logged ${uid()}`
  await signedIn(page)
  await createProduct(page, { name, price: '100', stock: '2' })
  await editProduct(page, name)
  await page.getByLabel('Price (৳)', { exact: true }).fill('140')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)

  await page.goto('/admin/activity?action=product.update')
  const row = page.getByTestId('activity-row').first()
  await expect(row).toContainText('Product changed')
  await expect(row).toContainText('price')
  await page.goto('/admin/activity?action=product.create')
  await expect(page.getByTestId('activity-row').first()).toContainText('Product added')
  await expect(
    page.getByTestId('activity-row').first().getByRole('button', { name: 'Undo this change' }),
  ).toHaveCount(0)
  await page.goto('/admin/activity?action=product.update')
  await row.getByRole('button', { name: 'Undo this change' }).click()
  await expect(page.getByTestId('activity-row').filter({ hasText: 'Undone' }).first()).toBeVisible()
  await editProduct(page, name)
  await expect(page.getByLabel('Price (৳)', { exact: true })).toHaveValue('100')
})

test('shop info feeds the help bubble; help bubble and bottom nav follow their feature switches', async ({
  page,
  a11y,
}) => {
  await signedIn(page)
  await page.goto('/admin/store')
  await expect(page.getByRole('heading', { level: 1, name: 'Shop info' })).toBeVisible()
  await a11y()
  await page.getByLabel('Phone', { exact: true }).fill('01711 234567')
  await page.getByLabel('WhatsApp number').fill('01711-234567')
  await page.getByLabel(/Messenger/).fill('ankito.bd')
  await page.getByLabel('Shop address').fill('House 12, Road 3, Mirpur 10, Dhaka')
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)

  await page.goto('/')
  await page.locator('details > summary').filter({ hasText: 'Help' }).click()
  await expect(page.getByRole('link', { name: 'Chat on WhatsApp' })).toHaveAttribute(
    'href',
    'https://wa.me/8801711234567',
  )
  await expect(page.getByRole('link', { name: 'Message on Messenger' })).toHaveAttribute(
    'href',
    'https://m.me/ankito.bd',
  )
  await expect(page.getByRole('link', { name: 'Call us' })).toHaveAttribute(
    'href',
    'tel:01711234567',
  )
  await expect(page.getByRole('link', { name: 'Back to top' })).toHaveAttribute('href', '#top')
  await expect(page.locator('nav[aria-label="Quick links"]')).toHaveCount(1)
  await a11y()

  const toggle = async (id: string, to: 'Turn off' | 'Turn on') => {
    await page.goto('/admin/features')
    await page.getByTestId(`module-${id}`).getByRole('button', { name: to }).click()
    await expect(page.getByTestId(`module-${id}`)).toContainText(to === 'Turn off' ? 'Off' : 'On')
  }
  await toggle('helpBubble', 'Turn off')
  await toggle('bottomNav', 'Turn off')
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Back to top' })).toHaveCount(0)
  await expect(page.locator('nav[aria-label="Quick links"]')).toHaveCount(0)
  await toggle('helpBubble', 'Turn on')
  await toggle('bottomNav', 'Turn on')

  // J1 floating buttons + mobile menu tabs.
  const design = async (side: 'left' | 'right', on: boolean) => {
    await page.goto('/admin/design')
    await page.getByLabel('Button side').selectOption(side)
    for (const l of ['List WhatsApp', 'Show Back to top', 'Show Search', 'Show Cart'])
      await page.getByLabel(l).setChecked(on)
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible()
    await page.goto('/')
  }
  await design('left', false)
  await expect(page.getByRole('complementary', { name: 'Help' })).toHaveAttribute(
    'data-side',
    'left',
  )
  await page.locator('details > summary').filter({ hasText: 'Help' }).click()
  await expect(page.getByRole('link', { name: 'Chat on WhatsApp' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Back to top' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Call us' })).toBeVisible()
  const quick = page.locator('nav[aria-label="Quick links"]')
  await expect(quick.locator('a[href="/search"]')).toHaveCount(0)
  await expect(quick.locator('a[href="/track"]')).toHaveCount(1)
  await expect(quick.getByRole('button')).toHaveCount(0)
  await a11y()
  await design('right', true)
  await expect(page.getByRole('complementary', { name: 'Help' })).toHaveAttribute(
    'data-side',
    'right',
  )
  await expect(quick.locator('a[href="/search"]')).toHaveCount(1)
})

test('announcement bar: messages scroll or rotate, link and close are optional, empty hides it', async ({
  page,
  a11y,
}) => {
  await signedIn(page)
  const save = async (messages: string, mode: string, link: string, closable: boolean) => {
    await page.goto('/admin/design')
    await page.getByLabel(/^Messages/).fill(messages)
    await page.getByLabel('Motion').selectOption(mode)
    await page.getByLabel('Link (optional)').fill(link)
    await page.getByLabel('Shoppers can close it').setChecked(closable)
    await page.getByRole('button', { name: 'Save' }).first().click()
  }
  const bar = page.getByRole('complementary', { name: 'Announcements' })

  await save('Free delivery over ৳2,000\n\nEid sale: 15% off attar', 'marquee', '/search', true)
  await saved(page)
  await page.goto('/')
  await expect(bar).toContainText('Eid sale: 15% off attar')
  await expect(bar.getByRole('link')).toHaveAttribute('href', '/search')
  await a11y()
  await bar.getByRole('button', { name: 'Close' }).click()
  await expect(bar).toHaveCount(0)

  await save('Delivery in 24–72 hours', 'rotate', '', false)
  await saved(page)
  await page.goto('/')
  await expect(bar).toContainText('Delivery in 24–72 hours')
  await expect(bar.getByRole('link')).toHaveCount(0)
  await expect(bar.getByRole('button', { name: 'Close' })).toHaveCount(0)

  await save('Bad link', 'rotate', 'javascript:alert(1)', false)
  await expect(page.getByRole('alert')).toBeVisible()
  await save('', 'rotate', '', true)
  await saved(page)
  await page.goto('/')
  await expect(bar).toHaveCount(0)
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
  // Enough units to rank first in today's top products whatever other tests sold.
  const line = page.getByRole('group', { name: `Quantity: ${name}` })
  for (let i = 1; i < 5; i++) await line.getByRole('button', { name: '+' }).click()
  await expect(line.locator('output')).toHaveText('5')
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
  test.setTimeout(90_000) // every banner kind, then the hero slider's autoplay timings
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
  // B3: the posters become the hero slider.
  const slider = async (enabled: boolean, effect: string) => {
    await page.goto('/admin/promotions')
    await page.getByLabel(/Show poster banners as a slider/).setChecked(enabled)
    await page.getByLabel(/Seconds per slide/).fill('3')
    await page.getByLabel('Effect').selectOption(effect)
    await page.getByRole('button', { name: 'Save' }).first().click()
    await saved(page)
  }
  await slider(true, 'fade')
  await page.goto('/')
  const hero = page.getByRole('region', { name: 'Featured' })
  await expect(hero).toContainText(`Eid ${id}`)
  await expect(hero).toContainText(`Puja ${id}`)
  await expect(page.getByRole('region', { name: 'Promotions' })).not.toContainText(`Eid ${id}`)
  await a11y()
  const dot = (i: number) => hero.getByRole('button', { name: `Slide ${i} of 2`, exact: true })
  await expect(dot(1)).toHaveAttribute('aria-current', 'true')
  // Autoplay moves on by itself (3 s per slide).
  await expect(dot(2)).toHaveAttribute('aria-current', 'true', { timeout: 8000 })
  await hero.getByRole('button', { name: 'Next slide' }).click()
  await expect(dot(1)).toHaveAttribute('aria-current', 'true')
  await hero.getByRole('button', { name: 'Previous slide' }).click()
  await expect(dot(2)).toHaveAttribute('aria-current', 'true')
  await dot(1).click()
  await expect(dot(1)).toHaveAttribute('aria-current', 'true')
  await dot(1).blur()
  await page.mouse.move(0, 0)
  // Reduced motion: no autoplay.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await page.waitForTimeout(4000)
  await expect(dot(1)).toHaveAttribute('aria-current', 'true')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await slider(true, 'slide')
  await page.goto('/')
  await expect(hero).toHaveAttribute('data-effect', 'slide')
  await slider(false, 'slide')
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Featured' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Promotions' })).toContainText(`Eid ${id}`)
  await page.goto('/admin/promotions')

  // Leave the home page clean for whatever runs next.
  while ((await page.getByTestId('banner-row').count()) > 0) {
    const n = await page.getByTestId('banner-row').count()
    await page.getByTestId('banner-row').first().getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByTestId('banner-row')).toHaveCount(n - 1)
  }
  await expect(page.getByText('No banners yet')).toBeVisible()
})

test('product page: gallery arrows and thumbnails, fit and thumbnail settings, share, quantity (A12)', async ({
  page,
  context,
  a11y,
}) => {
  const id = uid()
  const [two, one] = [`Gallery ${id}`, `Single ${id}`]
  await signedIn(page)
  await createProduct(page, { name: two, price: '250', stock: '3' })
  await editProduct(page, two)
  await uploadPhoto(page)
  await uploadPhoto(page, '#a8763e')
  await createProduct(page, { name: one, price: '90', stock: '1' })
  await editProduct(page, one)
  await uploadPhoto(page)

  const design = async (fit: string, thumbs: string) => {
    await page.goto('/admin/design')
    await page.getByLabel('Picture fit').selectOption(fit)
    await page.getByLabel('Thumbnails').selectOption(thumbs)
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible()
  }
  await design('contain', 'side')
  const url = (name: string) => `/p/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  await page.goto(url(two))
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-fit="contain"][data-thumbs="side"]')).toHaveCount(1)
  const prev = page.getByRole('button', { name: 'Previous photo' })
  const next = page.getByRole('button', { name: 'Next photo' })
  await expect(prev).toBeDisabled()
  await next.click()
  await expect(page.getByRole('button', { name: 'Photo 2' })).toHaveAttribute(
    'aria-current',
    'true',
  )
  await expect(next).toBeDisabled()
  await prev.click()
  await expect(page.getByRole('button', { name: 'Photo 1' })).toHaveAttribute(
    'aria-current',
    'true',
  )
  await page.getByRole('button', { name: 'Photo 2' }).click()
  await expect(prev).toBeEnabled()
  await a11y()

  const share = page.getByRole('group', { name: 'Share' })
  await expect(share.getByRole('link', { name: 'Share on WhatsApp' })).toHaveAttribute(
    'href',
    new RegExp(`^https://wa\\.me/\\?text=.*${encodeURIComponent(url(two))}$`),
  )
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await share.getByRole('button', { name: 'Copy link' }).click()
  await expect(share.getByText('Link copied')).toBeVisible()

  const qty = page.getByRole('group', { name: 'Quantity', exact: true })
  for (const b of ['+', '+', '+', '−'] as const) await qty.getByRole('button', { name: b }).click()
  await expect(qty.locator('output')).toHaveText('2')
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.getByTestId('cart-subtotal')).toHaveText('৳500')

  await page.goto(url(one))
  await expect(page.getByRole('button', { name: 'Next photo' })).toHaveCount(0)
  await design('cover', 'below')
})

test('screenshot reviews: owner uploads chat screenshots, product pages show them (A7)', async ({
  page,
  a11y,
}) => {
  const name = `Proof ${uid()}`
  await signedIn(page)
  await createProduct(page, { name, price: '120', stock: '2' })
  await page.goto('/admin/reviews')
  const shots = page.getByTestId('screenshots').getByRole('listitem')
  for (const [caption, color] of [
    ['From WhatsApp', '#25d366'],
    ['', '#0084ff'],
  ]) {
    const n = await shots.count()
    await page.getByLabel(/^Screenshot \(/).setInputFiles(await photo(color))
    await page.getByLabel('Caption (optional)').fill(caption!)
    await page.getByRole('button', { name: 'Upload screenshot' }).click()
    await expect(shots).toHaveCount(n + 1)
  }
  await a11y()

  const url = `/p/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  await page.goto(url)
  const strip = page.getByRole('region', { name: 'What customers say' })
  await expect(strip.locator('img')).toHaveCount(2)
  await expect(strip).toContainText('From WhatsApp')
  await a11y()

  await page.goto('/admin/reviews')
  while ((await shots.count()) > 0) {
    const n = await shots.count()
    await shots.first().getByRole('button', { name: 'Remove' }).click()
    await expect(shots).toHaveCount(n - 1)
  }
  await page.goto(url)
  await expect(page.getByRole('region', { name: 'What customers say' })).toHaveCount(0)
})

test('wishlist: save on the product page, header count, move to cart, remove, feature switch (A10)', async ({
  page,
  a11y,
}) => {
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  const name = `Wish ${uid()}`
  const url = `/p/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  await signedIn(page)
  await createProduct(page, { name, price: '320', stock: '4' })
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  const save = page.getByRole('button', { name: /wishlist/ })
  const count = (n: number) => page.getByRole('link', { name: `Wishlist (${n})` })
  await expect(count(0)).toBeVisible()
  await save.click()
  await expect(save).toHaveAttribute('aria-pressed', 'true')
  await expect(save).toHaveText('Saved to wishlist')
  await expect(count(1)).toBeVisible()
  await save.click()
  await expect(count(0)).toBeVisible()
  await save.click()
  await a11y()

  await page.goto('/wishlist')
  const list = page.locator('main li')
  await expect(list.getByRole('link', { name })).toBeVisible()
  await a11y()
  await list.getByRole('button', { name: 'Move to cart' }).click()
  await expect(page.getByTestId('cart-subtotal')).toHaveText('৳320')
  await page.keyboard.press('Escape')
  await expect(page.getByText('Nothing saved yet')).toBeVisible()

  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await save.click()
  await page.goto('/wishlist')
  await list.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('Nothing saved yet')).toBeVisible()
  await page.evaluate(() => localStorage.setItem('rlc-wishlist', '{oops'))
  await page.reload()
  await expect(page.getByText('Nothing saved yet')).toBeVisible()

  const toggle = async (to: 'Turn off' | 'Turn on') => {
    await page.goto('/admin/features')
    await page.getByTestId('module-wishlist').getByRole('button', { name: to }).click()
    await expect(page.getByTestId('module-wishlist')).toContainText(
      to === 'Turn off' ? 'Off' : 'On',
    )
  }
  await toggle('Turn off')
  expect((await page.goto('/wishlist'))!.status()).toBe(404)
  await page.goto(url)
  await expect(page.getByRole('button', { name: /wishlist/ })).toHaveCount(0)
  await toggle('Turn on')
})

test('home builder: new sections, order, category row count; trust strip and budget bands (B5, B6, B12)', async ({
  page,
  a11y,
}) => {
  await signedIn(page)
  await page.goto('/admin/layouts')
  const row = (id: string) => page.getByTestId(`section-${id}`)
  await expect(row('trust-strip')).toContainText('Off')
  for (const id of [
    'category-rows',
    'brands',
    'budget-bands',
    'trust-strip',
    'screenshot-reviews',
  ]) {
    await row(id).getByRole('button', { name: 'Turn on' }).click()
    await expect(row(id)).toContainText('On')
  }
  await row('category-rows').getByLabel('Products per row').fill('2')
  await row('category-rows').getByRole('button', { name: 'Save' }).click()
  await page.reload()
  await expect(row('category-rows').getByLabel('Products per row')).toHaveValue('2')
  await a11y()
  // Drag "Verified business" up one place; the order is saved.
  const item = page.getByRole('listitem').filter({ has: row('trust-strip') })
  const above = item.locator('xpath=preceding-sibling::li[1]')
  const before = await above.getByTestId(/^section-/).getAttribute('data-testid')
  const from = (await item.getByRole('button', { name: 'Drag to reorder' }).boundingBox())!
  const to = (await above.boundingBox())!
  const posted = page.waitForResponse((r) => r.request().method() === 'POST')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()
  expect((await posted).ok()).toBe(true)
  await page.reload()
  await expect(
    page
      .getByRole('listitem')
      .filter({ has: page.getByTestId(before!) })
      .locator('xpath=preceding-sibling::li[1]'),
  ).toContainText('Verified business')

  // Nothing filled in yet: the trust strip and budget bands stay hidden.
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Verified business' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Shop by budget' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Shop by brand' })).toBeVisible()
  const rows = page.locator('section[aria-labelledby^="row-"]')
  await expect(rows.first()).toBeVisible()
  expect(await rows.first().locator('.rlc-card').count()).toBeLessThanOrEqual(2)
  await expect(rows.first().getByRole('link', { name: /^Shop .* →$/ })).toBeVisible()

  await page.goto('/admin/store')
  await page.getByLabel('Trade licence no.').fill('TRAD/DNCC/123456')
  await page.getByLabel('TIN', { exact: true }).fill('123456789012')
  await page.getByLabel('Warranty / replacement policy').fill('7-day replacement on damaged items')
  await page.getByLabel('Shop by budget').fill('Under ৳500: 500\nUnder ৳200: 200')
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)
  await page.goto('/')
  const trust = page.getByRole('region', { name: 'Verified business' })
  await expect(trust).toContainText('TRAD/DNCC/123456')
  await expect(trust).toContainText('7-day replacement')
  await expect(page.getByRole('link', { name: 'Under ৳200' })).toHaveAttribute(
    'href',
    '/search?max=200',
  )
  await a11y()

  // Certificates open full size from the strip; the strip can also sit above every page's footer.
  await page.goto('/admin/store')
  await page.getByLabel('Certificate photo').setInputFiles(await photo('#c9a45c'))
  await page.getByLabel(/^What it is/).fill('Trade licence 2026')
  await page.getByRole('button', { name: 'Add certificate' }).click()
  await expect(page.getByTestId('admin-certificates')).toContainText('Trade licence 2026')
  await page.getByLabel(/above the footer on every page/).check()
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)
  await page.goto('/track')
  const strip = page.getByRole('region', { name: 'Verified business' })
  await expect(strip).toHaveCount(1)
  await strip.getByRole('button', { name: 'Trade licence 2026' }).click()
  const viewer = page.getByRole('dialog', { name: 'Trade licence 2026' })
  await expect(viewer).toBeVisible()
  await a11y()
  await viewer.getByRole('button', { name: 'Close' }).click()
  await expect(viewer).toBeHidden()
  // The design page points to where checkout, order buttons and thank-you are set.
  await page.goto('/admin/design')
  await page.getByRole('link', { name: 'Thank-you page' }).click()
  await expect(page).toHaveURL(/\/admin\/store#thank-you$/)
  await page.getByRole('button', { name: 'Remove Trade licence 2026' }).click()
  await expect(page.getByTestId('admin-certificates')).toBeEmpty()
  await page.getByLabel(/above the footer on every page/).uncheck()
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)

  // Back to how other tests expect the shop.
  await page.goto('/admin/store')
  for (const l of ['Trade licence no.', 'Warranty / replacement policy', 'Shop by budget'])
    await page.getByLabel(l).fill('')
  await page.getByLabel('TIN', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)
  await page.goto('/admin/layouts')
  for (const id of ['category-rows', 'brands', 'budget-bands', 'trust-strip', 'screenshot-reviews'])
    await row(id).getByRole('button', { name: 'Turn off' }).click()
  await expect(row('trust-strip')).toContainText('Off')
})

test('checkout: extra fields from Shop info, edit lines in checkout, the big button (C6, C18, C19)', async ({
  page,
  a11y,
}) => {
  const id = uid()
  const [a, b] = [`Checkout A ${id}`, `Checkout B ${id}`]
  await signedIn(page)
  const fields = async (email: string, on: boolean) => {
    await page.goto('/admin/store')
    await page.getByLabel('Email at checkout').selectOption(email)
    for (const l of ['Ask for a preferred delivery time', 'Offer gift wrap'])
      await page.getByLabel(l).setChecked(on)
    await page.getByRole('button', { name: 'Save' }).click()
    await saved(page)
  }
  await fields('required', true)
  await createProduct(page, { name: a, price: '100', stock: '5' })
  await createProduct(page, { name: b, price: '250', stock: '5' })
  const url = (n: string) => `/p/${n.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  await page.goto(url(a))
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.goto(url(b))
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)

  const total = page.getByTestId('checkout-total')
  await expect(total).toHaveText('৳410')
  const line = (n: string) => page.getByRole('group', { name: `Quantity: ${n}` })
  await line(b).getByRole('button', { name: '+' }).click()
  await expect(total).toHaveText('৳660')
  await line(b).getByRole('button', { name: '−' }).click()
  await line(a).getByRole('button', { name: 'Remove' }).click()
  await expect(line(a).getByRole('button', { name: 'Tap again to remove' })).toBeVisible()
  await line(a).getByRole('button', { name: 'Tap again to remove' }).click()
  await expect(line(a)).toHaveCount(0)
  await expect(total).toHaveText('৳310')
  await a11y()

  await fillCheckout(page)
  // The browser asks for the email too; without it the server still says so.
  await page.getByLabel('Email', { exact: true }).evaluate((e) => e.removeAttribute('required'))
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Please add your email.' })).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill('rahim@example.com')
  await page.getByLabel('Second phone (optional)').fill('01812345678')
  await page.getByLabel('Preferred delivery time').selectOption('evening')
  await page.getByLabel('Gift wrap this order').check()
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)
  const no = (await page.getByTestId('order-no').textContent())!.replace('#', '')

  await page.goto(`/admin/orders?q=${no}`)
  await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
  const extras = page.getByTestId('order-extras')
  await expect(extras).toContainText('01812345678')
  await expect(extras).toContainText('Evening (5–9)')
  await expect(extras).toContainText('Gift wrap')
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByTestId('order-events')).toContainText('Cancelled')

  await fields('optional', false)
  await page.goto('/admin/store')
  await page.getByLabel('Email at checkout').selectOption('off')
  await page.getByRole('button', { name: 'Save' }).click()
  await saved(page)
  await page.goto(url(a))
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)
  await expect(page.getByLabel(/^Email/)).toHaveCount(0)
  await fields('optional', false)
})

test('coupons: percent, fixed and automatic free delivery; checkout code box, order and invoice show the discount (C2)', async ({
  page,
  a11y,
}) => {
  const id = uid()
    .replace(/[^a-z0-9]/gi, '')
    .slice(-6)
    .toUpperCase()
  const name = `Coupon item ${id}`
  await signedIn(page)
  await createProduct(page, { name, price: '500', stock: '9' })
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
  const add = async (fill: () => Promise<void>) => {
    await page.goto('/admin/coupons')
    await expect(page.getByRole('heading', { name: 'Add coupon' })).toBeVisible()
    await fill()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/\/admin\/coupons$/)
  }
  await add(async () => {
    await page.getByLabel(/^Code/).fill(`save10-${id}`)
    await page.getByLabel('How much (percent or ৳)').fill('10')
    await page.getByLabel('Minimum order (৳, optional)').fill('100')
    await page.getByLabel('Starts').fill(today)
    await page.getByLabel('Ends').fill('2099-12-31')
    await page.getByLabel('Total uses (optional)').fill('5')
    await page.getByLabel('Uses per phone (optional)').fill('2')
    await page.getByLabel('Only these products (optional)').selectOption({ label: name })
  })
  await add(async () => {
    await page.getByLabel(/^Code/).fill(`FLAT-${id}`)
    await page.getByLabel('Type').selectOption('fixed')
    await page.getByLabel('How much (percent or ৳)').fill('50')
  })
  await add(async () => {
    await page.getByLabel(/^Code/).fill(`SHIP-${id}`)
    await page.getByLabel('Type').selectOption('free_shipping')
    await page.getByLabel('Apply automatically (no code needed)').check()
  })
  const row = (code: string) => page.getByRole('link', { name: new RegExp(code) })
  await expect(row(`SAVE10-${id}`)).toContainText('10%')
  await expect(row(`FLAT-${id}`)).toContainText('৳50')
  await expect(row(`SHIP-${id}`)).toContainText('Free delivery')
  await a11y()
  await row(`SAVE10-${id}`).click()
  await expect(page.getByLabel('Ends')).toHaveValue('2099-12-31')
  await expect(page.getByLabel('Total uses (optional)')).toHaveValue('5')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin\/coupons$/)
  await row(`FLAT-${id}`).click()
  await expect(page.getByLabel('How much (percent or ৳)')).toHaveValue('50')
  await expect(page.getByLabel('Starts')).toHaveValue('')

  await page.goto(`/p/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)
  const total = page.getByTestId('checkout-total')
  const apply = page.getByRole('button', { name: 'Apply', exact: true })
  // No code typed: the automatic free delivery.
  await apply.click()
  await expect(page.getByTestId('checkout-discount')).toContainText(`SHIP-${id}`)
  await expect(total).toHaveText('৳500')
  await page.getByLabel('Have a code?').fill('nope')
  await apply.click()
  await expect(page.getByRole('alert').filter({ hasText: 'That code doesn’t work' })).toBeVisible()
  await fillCheckout(page, '01633' + String(Date.now()).slice(-6))
  await page.getByLabel('Have a code?').fill(`save10-${id}`)
  await apply.click()
  await expect(page.getByTestId('checkout-discount')).toContainText('−৳50')
  await expect(total).toHaveText('৳510')
  await a11y()
  // A changed cart drops the old quote; placing re-prices anyway.
  await page
    .getByRole('group', { name: `Quantity: ${name}` })
    .getByRole('button', { name: '+' })
    .click()
  await expect(page.getByTestId('checkout-discount')).toHaveCount(0)
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)
  const no = (await page.getByTestId('order-no').textContent())!.replace('#', '')
  await page.goto(`/admin/orders?q=${no}`)
  await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
  await expect(page.getByTestId('order-discount')).toHaveText('−৳100')
  await expect(page.getByTestId('order-total')).toHaveText('৳960')
  const orderUrl = page.url()
  await page.getByRole('link', { name: 'Print invoice' }).click()
  await expect(page.getByText(`Discount · SAVE10-${id}`)).toBeVisible()
  await page.goto(orderUrl)
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByTestId('order-events')).toContainText('Cancelled')

  // Back to normal for later tests: the automatic coupon off; the module switch works.
  await page.goto('/admin/coupons')
  await row(`SHIP-${id}`).click()
  await expect(page.getByRole('heading', { name: 'Edit coupon' })).toBeVisible()
  // The form shows this coupon's saved values, not the last one opened.
  await expect(page.getByLabel('Type')).toHaveValue('free_shipping')
  await expect(page.getByLabel('Apply automatically (no code needed)')).toBeChecked()
  await page.getByLabel('Active').uncheck()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(`SHIP-${id}`)).toContainText('Off')
  const toggle = async (to: 'Turn off' | 'Turn on') => {
    await page.goto('/admin/features')
    await page.getByTestId('module-coupons').getByRole('button', { name: to }).click()
    await expect(page.getByTestId('module-coupons')).toContainText(to === 'Turn off' ? 'Off' : 'On')
  }
  await toggle('Turn off')
  await page.goto(`/p/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)
  await expect(page.getByTestId('checkout-total')).toBeVisible()
  await expect(page.getByLabel('Have a code?')).toHaveCount(0)
  await toggle('Turn on')
})

test('free delivery rule with the cart hint; per-product quantity and order limits (C3, C7)', async ({
  page,
  a11y,
}) => {
  const name = `Limited ${uid()}`
  const url = `/p/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  await signedIn(page)
  const rules = async (free: string, max: string) => {
    await page.goto('/admin/store')
    await page.getByLabel('Free above (৳, optional)').fill(free)
    await page.getByLabel('Maximum order (৳, optional)').fill(max)
    await page.getByRole('button', { name: 'Save' }).click()
    await saved(page)
  }
  await rules('1000', '3000')
  await page.goto('/admin/store')
  await expect(page.getByLabel('Free above (৳, optional)')).toHaveValue('1000')
  await a11y()
  await createProduct(page, { name, price: '400', stock: '9' })
  await editProduct(page, name)
  await page.getByLabel('Minimum per order (optional)').fill('2')
  await page.getByLabel('Maximum per order (optional)').fill('5')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  await editProduct(page, name)
  await expect(page.getByLabel('Minimum per order (optional)')).toHaveValue('2')

  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.getByTestId('free-hint')).toHaveText('Add ৳600 more for free delivery')
  await a11y()
  await page.getByRole('link', { name: 'Checkout' }).click()
  await page.waitForURL(/\/checkout$/)
  await fillCheckout(page)
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'needs a bigger quantity' })).toBeVisible()
  const line = page.getByRole('group', { name: `Quantity: ${name}` })
  for (let i = 0; i < 2; i++) await line.getByRole('button', { name: '+' }).click()
  // ৳1,200 is over ৳1,000: delivery is free, the total is the goods alone.
  await expect(page.getByTestId('checkout-total')).toHaveText('৳1,200')
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)
  const no = (await page.getByTestId('order-no').textContent())!.replace('#', '')
  await page.goto(`/admin/orders?q=${no}`)
  await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
  await expect(page.getByTestId('order-total')).toHaveText('৳1,200')
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByTestId('order-events')).toContainText('Cancelled')

  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.getByRole('dialog', { name: 'Cart' }).getByRole('button', { name: '+' }).click()
  await page.getByRole('dialog', { name: 'Cart' }).getByRole('button', { name: '+' }).click()
  await expect(page.getByTestId('free-hint')).toHaveText('🎉 Your delivery is free')
  await rules('', '')
})

test('district list at checkout and zones by district (C4, C17)', async ({ page, a11y }) => {
  const name = `Zoned ${uid()}`
  await signedIn(page)
  const setup = async (mode: string, khulna: string) => {
    await page.goto('/admin/store')
    await page.getByLabel('How shoppers type the district').selectOption({ label: mode })
    await page.getByText('Zone by district').click()
    await page.getByLabel('Khulna · খুলনা').selectOption({ label: khulna })
    await page.getByRole('button', { name: 'Save' }).click()
    await saved(page)
  }
  await setup('Text with a list of all 64 districts', 'Inside Dhaka')
  await page.goto('/admin/store')
  await expect(page.getByLabel('Khulna · খুলনা')).toHaveValue('inside-dhaka')
  await expect(page.getByLabel('Zone for every other district')).toHaveValue('outside-dhaka')
  await a11y()

  await createProduct(page, { name, price: '200', stock: '5' })
  await page.goto(`/p/${slug(name)}`)
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.goto('/checkout')
  await expect(page.locator('#bd-districts option[value="খুলনা"]')).toHaveCount(1)
  await page.getByLabel('District').fill('খুলনা')
  await expect(page.getByTestId('zone-detected')).toHaveText('Delivery area found: Inside Dhaka')
  await expect(page.getByLabel('Inside Dhaka')).toBeChecked()
  await page.getByLabel('District').fill('Rajshahi')
  await expect(page.getByLabel('Outside Dhaka')).toBeChecked()
  await a11y()
  await setup('Free text', 'Same as every other district')
})

test('thank-you page: owner texts, colour and buttons; the placing browser sees its order (C10)', async ({
  page,
  a11y,
}) => {
  const name = `Thanks ${uid()}`
  await signedIn(page)
  await page.goto('/admin/store')
  const original = await page.getByLabel('WhatsApp number').inputValue()
  type Thanks = { heading: string; message: string; accent: string; home: boolean; wa: string }
  const thanks = async (v: Thanks) => {
    await page.goto('/admin/store')
    await page.getByLabel('WhatsApp number').fill(v.wa)
    await page.getByLabel('Heading', { exact: true }).fill(v.heading)
    await page.getByLabel('Message (optional)').fill(v.message)
    await page.getByLabel('Accent colour (optional, e.g. #1f7a4d)').fill(v.accent)
    await page.getByLabel('Show “Back to the shop”').setChecked(v.home)
    await page.getByRole('button', { name: 'Save' }).click()
    await saved(page)
  }
  const plain = { heading: '', message: '', accent: '', home: true }
  // Defaults, no WhatsApp; without the placing cookie only the number shows.
  await thanks({ ...plain, wa: '' })
  await page.goto('/order/999999')
  await expect(page.getByRole('heading', { name: 'Thank you! Order placed.' })).toBeVisible()
  await expect(page.getByTestId('placed-order')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Back to the shop' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Confirm on WhatsApp' })).toBeHidden()

  await thanks({
    heading: 'Shukria!',
    message: 'We pack every order by hand.',
    accent: '#1f7a4d',
    home: false,
    wa: '01711000000',
  })
  await page.goto('/admin/store')
  await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Shukria!')
  await a11y()

  await createProduct(page, { name, price: '250', stock: '5' })
  await page.goto(`/p/${slug(name)}`)
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.goto('/checkout')
  await fillCheckout(page)
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)
  const no = (await page.getByTestId('order-no').textContent())!.replace('#', '')
  await expect(page.getByRole('heading', { name: 'Shukria!' })).toBeVisible()
  await expect(page.getByTestId('thanks-message')).toHaveText('We pack every order by hand.')
  await expect(page.getByTestId('placed-order')).toContainText(`${name} × 1`)
  await expect(page.getByTestId('placed-order')).toContainText('Rahim Uddin')
  await expect(page.getByRole('link', { name: 'Back to the shop' })).toBeHidden()
  await expect(page.getByRole('link', { name: 'Confirm on WhatsApp' })).toHaveAttribute(
    'href',
    `https://wa.me/01711000000?text=${encodeURIComponent(`Hello, I just placed order #${no}.`)}`,
  )
  await a11y()
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute('data-printed', '1')
  })
  await page.getByRole('button', { name: 'Print invoice' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-printed', '1')

  await thanks({ ...plain, wa: original })
  await page.goto(`/admin/orders?q=${no}`)
  await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByTestId('order-events')).toContainText('Cancelled')
})

test('manual order: customer lookup, products and variants, discount, source tag and filter (C12, C15)', async ({
  page,
  a11y,
}) => {
  const id = uid()
  const [name, sized] = [`Manual ${id}`, `Sized ${id}`]
  const phone = `015${Date.now().toString().slice(-8)}`
  await signedIn(page)
  await createProduct(page, { name, price: '300', stock: '9' })
  await createProduct(page, { name: sized, price: '500', stock: '0' })
  await editProduct(page, sized)
  await page.getByLabel('Options', { exact: true }).fill('Size: M')
  await page.getByRole('button', { name: 'Apply options' }).click()
  await page.getByLabel('Stock quantity — M', { exact: true }).fill('4')
  await page.getByRole('button', { name: 'Update prices and stock' }).click()
  await page.reload()
  await expect(page.getByLabel('Stock quantity', { exact: true })).toHaveValue('4')

  await page.goto('/admin/orders')
  const newOrder = (await page.getByRole('link', { name: 'New order' }).getAttribute('href'))!
  await page.goto(newOrder)
  const found = page.getByRole('status').filter({ hasText: /customer|last order/ })
  await page.getByLabel('Customer phone').fill(phone)
  await page.getByRole('button', { name: 'Find customer' }).click()
  await expect(found).toHaveText('New customer — type the details.')
  await page.getByLabel('Name').fill('Salma Begum')
  await page.getByLabel('District').fill('Khulna')
  await page.getByLabel('Area / Thana').fill('Sonadanga')
  await page.getByLabel('Full address').fill('House 4, Road 7')
  await page.getByLabel('Product 1').selectOption({ label: `${name} — ৳300` })
  await page.getByLabel('Qty 1').fill('2')
  await page.getByRole('button', { name: 'Add another product' }).click()
  await page.getByLabel('Product 2').selectOption({ label: `${sized} (M) — ৳500` })
  await page.getByRole('button', { name: 'Add another product' }).click()
  await page.getByRole('button', { name: 'Remove' }).last().click()
  await expect(page.getByLabel('Product 3')).toHaveCount(0)
  await page.getByLabel('Delivery zone').selectOption({ index: 1 })
  await page.getByLabel('Order came from').selectOption({ label: 'Phone call' })
  await a11y()
  await page.getByLabel('Discount (৳)').fill('99999')
  await page.getByRole('button', { name: 'Create order' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'The discount can’t be more than the order total.' }),
  ).toBeVisible()
  await page.getByLabel('Discount (৳)').fill('50')
  await page.getByRole('button', { name: 'Create order' }).click()
  await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}$/)
  const orderUrl = page.url()
  await expect(page.getByTestId('order-discount')).toHaveText('−৳50')
  await expect(page.getByText(`${sized} (M)`)).toBeVisible()
  await expect(page.getByText('House 4, Road 7, Sonadanga, Khulna')).toBeVisible()

  await page.goto('/admin/orders?source=voice')
  const row = page.getByRole('link').filter({ hasText: phone })
  await expect(row.getByTestId('order-source')).toHaveText('Phone call')
  await expect(page.getByLabel('Source')).toHaveValue('voice')
  await page.goto(orderUrl)
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByTestId('order-events')).toContainText('Cancelled')

  // The same phone again: the form fills from that order.
  await page.goto(newOrder)
  await page.getByLabel('Customer phone').fill(phone)
  await page.getByRole('button', { name: 'Find customer' }).click()
  await expect(found).toHaveText('Filled in from their last order.')
  await expect(page.getByLabel('Name')).toHaveValue('Salma Begum')
  await expect(page.getByLabel('Full address')).toHaveValue('House 4, Road 7')
})

test('order guard: block from an order, limits, duplicates, the report (D1, D3, D4, D5)', async ({
  page,
  a11y,
}) => {
  const name = `Guarded ${uid()}`
  const stamp = Date.now().toString().slice(-8)
  const [p1, p2] = [`016${stamp}`, `013${stamp}`]
  await signedIn(page)
  await createProduct(page, { name, price: '120', stock: '50' })
  const toOrder = async (no: string) => {
    await page.goto(`/admin/orders?q=${no}`)
    await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
    await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}$/)
  }
  const checkoutAs = async (phone: string) => {
    await page.goto(`/p/${slug(name)}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.goto('/checkout')
    await fillCheckout(page, phone)
    await page.getByRole('button', { name: 'Place order' }).click()
  }
  const placed = async () => {
    await page.waitForURL(/\/order\/\d+$/)
    return (await page.getByTestId('order-no').textContent())!.replace('#', '')
  }
  const rules = async (perWindow: string, duplicates: boolean) => {
    await page.goto('/admin/fraud')
    await page.getByLabel('Orders per phone, IP or device (0 = no limit)').fill(perWindow)
    await page.getByLabel('Refuse possible duplicates at checkout').setChecked(duplicates)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await saved(page)
  }
  const nos: string[] = []

  await checkoutAs(p1)
  nos.push(await placed())
  await toOrder(nos[0]!)
  await expect(page.getByTestId('order-block').getByRole('button')).toHaveText([
    'Block phone',
    'Block IP',
    'Block device',
  ])
  await page.getByRole('button', { name: 'Block phone' }).click()
  await checkoutAs(p1)
  await expect(
    page.getByRole('alert').filter({ hasText: 'Sorry, we can’t take this order online.' }),
  ).toBeVisible()

  await page.goto('/admin/fraud')
  await expect(page.getByTestId('blocklist')).toContainText(p1)
  await expect(page.getByTestId('attempts')).toContainText(`Blocked · ${p1}`)
  await page.getByLabel('Block a').selectOption('ip')
  await page.getByLabel('Value').fill('203.0.113.7')
  await page.getByLabel('Note (optional)').fill('spam bot')
  await page.getByRole('button', { name: 'Block', exact: true }).click()
  await expect(page.getByTestId('blocklist')).toContainText('IP 203.0.113.7 spam bot')
  await a11y()
  for (const v of ['203.0.113.7', p1]) {
    await page.getByRole('button', { name: `Unblock ${v}` }).click()
    await expect(page.getByRole('button', { name: `Unblock ${v}` })).toHaveCount(0)
  }

  // This browser (and IP) already ordered: a limit of 1 refuses the next one.
  await rules('1', false)
  await checkoutAs(p2)
  await expect(page.getByRole('alert').filter({ hasText: 'several orders just now' })).toBeVisible()
  await rules('0', true)
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Place order' }).click()
  nos.push(await placed())
  await checkoutAs(p2)
  await expect(
    page.getByRole('alert').filter({ hasText: 'looks like an order you already placed' }),
  ).toBeVisible()
  await rules('0', false)
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Place order' }).click()
  nos.push(await placed())
  await page.goto(`/admin/orders?q=${p2}`)
  await expect(page.getByTestId('order-duplicate')).toHaveText(
    new RegExp(`Possible duplicate of #${nos[1]} \\(Pending, \\d+ h earlier\\)`),
  )
  for (const no of nos) {
    await toOrder(no)
    await page.getByRole('button', { name: 'Cancel order' }).click()
    await expect(page.getByTestId('order-events')).toContainText('Cancelled')
  }
  await page.goto('/admin/fraud')
  await expect(page.getByTestId('risky')).toContainText(
    `${p2}: 2 of 2 orders cancelled or returned`,
  )
})

test('order buttons: owner picks and orders them; WhatsApp message, call link, phone buy bar (B2)', async ({
  page,
  a11y,
}) => {
  const name = `Paths ${uid()}`
  await signedIn(page)
  await createProduct(page, { name, price: '250', stock: '9' })
  await page.goto('/admin/store')
  const [wa, phone] = [
    await page.getByLabel('WhatsApp number').inputValue(),
    await page.getByLabel('Phone', { exact: true }).inputValue(),
  ]
  const paths = async (v: { wa: string; phone: string; on: boolean }) => {
    await page.goto('/admin/store')
    await page.getByLabel('WhatsApp number').fill(v.wa)
    await page.getByLabel('Phone', { exact: true }).fill(v.phone)
    for (const l of ['Order on WhatsApp', 'Call to order', 'Buy bar at the bottom on phones'])
      await page.getByLabel(l).setChecked(v.on)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await saved(page)
  }
  await paths({ wa: '01711000000', phone: '01811000000', on: true })
  // Drag "Order on WhatsApp" above "Order now".
  const item = page.getByRole('listitem').filter({ hasText: 'Order on WhatsApp' })
  await item.scrollIntoViewIfNeeded()
  const from = (await item.getByRole('button', { name: 'Drag to reorder' }).boundingBox())!
  const to = (await item.locator('xpath=preceding-sibling::li[1]').boundingBox())!
  // The reorder action posts the new id order (the bell's poll posts too).
  const posted = page.waitForResponse((r) => !!r.request().postData()?.includes('"whatsapp","now"'))
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()
  const res = await posted
  expect(res.ok()).toBe(true)
  await a11y()

  await page.goto(`/p/${slug(name)}`)
  await page.waitForLoadState('networkidle')
  const buttons = page.getByTestId('buy-buttons').locator('a, button')
  await expect(buttons).toHaveText([
    'Add to cart',
    'Order on WhatsApp',
    'Order now',
    'Call to order',
  ])
  await page.getByRole('group', { name: 'Quantity' }).getByRole('button', { name: '+' }).click()
  await expect(page.getByRole('link', { name: 'Order on WhatsApp' })).toHaveAttribute(
    'href',
    new RegExp(
      `^https://wa\\.me/01711000000\\?text=${encodeURIComponent(`Hi, I want to order: ${name} × 2.`).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    ),
  )
  await expect(page.getByRole('link', { name: 'Call to order' })).toHaveAttribute(
    'href',
    'tel:01811000000',
  )
  await expect(page.getByTestId('sticky-buy')).toBeHidden()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByTestId('sticky-buy')).toBeVisible()
  await a11y()
  await page.getByTestId('sticky-buy').getByRole('button', { name: 'Cart' }).click()
  await page.getByRole('dialog', { name: 'Cart' }).getByRole('button', { name: 'Cancel' }).click()
  await page.getByTestId('sticky-buy').getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)
  await page.setViewportSize({ width: 1280, height: 800 })
  await paths({ wa, phone, on: false })
})

// Last in the file: "start fresh" deletes the owner's products.
test('layout switch: keep both, show demo and bring mine back, remove demo, start fresh (J3)', async ({
  page,
  a11y,
}) => {
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  await signedIn(page)
  expect((await page.goto('/admin/layouts/switch?preset=nope'))!.status()).toBe(404)
  await page.goto('/admin/layouts/switch?preset=fashion')
  await expect(page.getByTestId('switch-counts')).toContainText('demo pack has 3')
  await a11y()

  await useLayout(page, 'fashion', 'Switch, add demo')
  await expect(page.getByTestId('layout-fashion')).toContainText('In use')
  await expect(page.getByRole('button', { name: 'Remove demo products (3)' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Bring my products back/ })).toHaveCount(0)

  await useLayout(page, 'fashion', 'Switch, show demo')
  await page.goto('/search?q=')
  await expect(page.getByRole('link', { name: 'Jamdani Saree' }).first()).toBeVisible()
  // Only the demo pack shows; the owner's products are drafts now.
  await expect(page.locator('.rlc-card')).toHaveCount(3)
  await page.goto('/admin/layouts')
  await page.getByRole('button', { name: /^Bring my products back/ }).click()
  await expect(page.getByRole('button', { name: /^Bring my products back/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Remove demo products (3)' }).click()
  await expect(page.getByRole('button', { name: /^Remove demo products/ })).toHaveCount(0)

  // Start fresh needs the box and the typed word.
  await page.goto('/admin/layouts/switch?preset=grocery')
  await page.getByRole('button', { name: 'Delete mine and switch' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'type FRESH' })).toBeVisible()
  await page.getByRole('checkbox', { name: /products will be deleted/ }).check()
  await page.getByLabel('Type FRESH to confirm').fill('FRESH')
  await page.getByRole('button', { name: 'Delete mine and switch' }).click()
  await page.waitForURL(/\/admin\/layouts$/)
  await page.goto('/search?q=')
  await expect(page.locator('.rlc-card')).toHaveCount(3)
  await expect(page.getByRole('link', { name: 'Mustard Oil 1 L' }).first()).toBeVisible()
  await useLayout(page, 'general', 'Switch, keep mine')
})

test('couriers: accounts, send an order, webhook updates, bulk send (E1, E2)', async ({
  page,
  request,
  a11y,
}) => {
  test.setTimeout(60_000) // three couriers, webhooks for each, then a bulk send
  const name = `Parcel ${uid()}`
  const phone = `013${Date.now().toString().slice(-8)}`
  await signedIn(page)
  await page.goto('/admin/couriers')
  await expect(page.getByText(/A premium feature/)).toBeVisible()

  // Root Logic Lab unlocks couriers; the module then starts switched off.
  await page.context().clearCookies()
  await signedIn(page, e2eEnv.BOOTSTRAP_SUPER_EMAIL, e2eEnv.BOOTSTRAP_SUPER_PASSWORD)
  await page.goto('/admin/plan')
  await page.getByTestId('feature-courier').getByRole('button', { name: 'Grant' }).click()
  await expect(page.getByTestId('feature-courier')).toContainText('Included')
  await page.goto('/admin/features')
  await page.getByTestId('module-courier').getByRole('button', { name: 'Turn on' }).click()
  await expect(page.getByTestId('module-courier')).toContainText('On')

  await createProduct(page, { name, price: '500', stock: '9' })
  const nos: string[] = []
  for (let n = 0; n < 3; n++) {
    await page.goto(`/p/${slug(name)}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.goto('/checkout')
    await fillCheckout(page, phone)
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.waitForURL(/\/order\/\d+$/)
    nos.push((await page.getByTestId('order-no').textContent())!.replace('#', ''))
  }
  const open = async (no: string) => {
    await page.goto(`/admin/orders?q=${no}`)
    await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
    await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+$/)
  }
  // A pending order can't go yet; once confirmed, the page asks for a courier account.
  await open(nos[0]!)
  await expect(page.getByRole('button', { name: 'Send to courier' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm order' }).click()
  await expect(page.getByText('No courier account yet.')).toBeVisible()
  const order = page.url()
  await page.getByRole('link', { name: 'Add one in Couriers' }).click()

  await page.locator('#steadfast-label').fill('Main')
  await page.locator('#steadfast-apiKey').fill('sf-key')
  await page.locator('#steadfast-secretKey').fill('sf-secret')
  await page.getByRole('button', { name: 'Save account' }).first().click()
  const accounts = page.getByTestId('courier-accounts')
  await expect(accounts.getByRole('listitem').filter({ hasText: 'Main' })).toContainText('Default')
  await page.locator('#pathao-label').fill('Outside Dhaka')
  for (const f of ['clientId', 'clientSecret', 'username', 'password'])
    await page.locator(`#pathao-${f}`).fill(`p-${f}`)
  await page.locator('#pathao-storeId').fill('store-one')
  await page.getByRole('button', { name: 'Save account' }).nth(1).click()
  await alert(page, 'Please check the highlighted fields.')
  await page.locator('#pathao-storeId').fill('1234')
  await page.getByRole('button', { name: 'Save account' }).nth(1).click()
  await expect(accounts.getByRole('listitem')).toHaveCount(2)
  await page.getByRole('button', { name: 'Make default: Outside Dhaka' }).click()
  await expect(accounts.getByRole('listitem').filter({ hasText: 'Outside Dhaka' })).toContainText(
    'Default',
  )
  await page.getByRole('button', { name: 'Make default: Main' }).click()
  await expect(accounts.getByRole('listitem').filter({ hasText: 'Main' })).toContainText('Default')
  await a11y()
  const hook = await accounts
    .getByRole('listitem')
    .filter({ hasText: 'Main' })
    .getByRole('textbox')
    .inputValue()
  expect(hook).toMatch(/^http:\/\/127\.0\.0\.1:3100\/api\/courier\/hook\/[\w-]{32}$/)

  // Sent with the default account: the order ships and shows the parcel.
  await page.goto(order)
  await expect(page.getByLabel('Send with')).toHaveValue(/.+/)
  await page.getByRole('button', { name: 'Send to courier' }).click()
  const parcel = page.getByTestId('shipment')
  await expect(parcel).toContainText(`Tracking: LOG-${nos[0]}`)
  await expect(parcel).toContainText('pending')
  await expect(page.getByText('Shipped', { exact: true }).first()).toBeVisible()
  await a11y()

  // The courier's webhook moves it on; unknown links and other parcels change nothing.
  expect((await request.post(hook.replace(/[\w-]+$/, 'not-a-token'), { data: {} })).status()).toBe(
    404,
  )
  const post = (data: unknown) => request.post(hook, { data })
  expect(
    await (
      await request.post(hook, { data: 'not json', headers: { 'content-type': 'text/plain' } })
    ).json(),
  ).toEqual({ applied: false })
  expect(await (await post({ consignment_id: 'LOG-0', status: 'delivered' })).json()).toEqual({
    applied: false,
  })
  expect(await (await post({ consignment_id: `LOG-${nos[0]}`, status: 'hold' })).json()).toEqual({
    applied: true,
  })
  await post({ consignment_id: `LOG-${nos[0]}`, status: 'delivered', delivery_charge: 60 })
  await page.reload()
  await expect(parcel).toContainText('delivered')
  await expect(parcel).toContainText('Courier charge: ৳60')
  await expect(page.getByText('Delivered', { exact: true }).first()).toBeVisible()
  const cron = await request.get('/api/cron/outbox', {
    headers: { authorization: `Bearer ${e2eEnv.CRON_SECRET}` },
  })
  expect(cron.ok()).toBe(true)

  // Bulk: the confirmed one goes, the pending one is refused.
  await open(nos[1]!)
  await page.getByRole('button', { name: 'Confirm order' }).click()
  await expect(page.getByRole('button', { name: 'Send to courier' })).toBeVisible()
  await page.goto(`/admin/orders?q=${phone}`)
  for (const no of nos.slice(1)) await page.getByLabel(`Select order #${no}`).check()
  await page.getByRole('button', { name: 'Send to courier' }).click()
  await alert(page, 'Some ticked orders couldn’t be changed')
  await expect(page.getByTestId('order-parcel')).toHaveCount(2)
  await expect(page.getByTestId('order-parcel').first()).toContainText('Steadfast LOG-')

  // E3: one courier, two parcels — one delivered, one on the way; filters narrow the range.
  await page.goto('/admin/couriers')
  await page.getByRole('link', { name: 'Report' }).click()
  const report = page.getByTestId('courier-report')
  await expect(report.getByRole('row', { name: /Steadfast/ })).toContainText('100%')
  await expect(
    report
      .getByRole('row', { name: /Steadfast/ })
      .getByRole('cell')
      .first(),
  ).toHaveText('2')
  await page.getByLabel('Product', { exact: true }).selectOption({ label: name })
  await page.getByLabel('To', { exact: true }).fill('2099-12-31')
  await page.getByRole('button', { name: 'Show' }).click()
  await expect(page).toHaveURL(/product=/)
  await expect(report.getByRole('row', { name: /Steadfast/ })).toBeVisible()
  await page.getByLabel('From', { exact: true }).fill('2099-01-01')
  await page.getByRole('button', { name: 'Show' }).click()
  await expect(page.getByText('No parcels in this range.')).toBeVisible()
  await a11y()

  // E5: the delivered parcel's cash and charge, corrected, then paid out.
  await page.getByRole('link', { name: 'Payouts' }).click()
  const totals = page.getByTestId('payout-totals')
  await expect(totals).toContainText('৳60')
  await page.getByLabel(`Collected (#${nos[0]})`).fill('400')
  await page.getByLabel(`Charge (#${nos[0]})`).fill('70')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(totals).toContainText('৳400')
  await expect(totals).toContainText('৳330')
  await a11y()
  await page.getByLabel(`Select parcel of order #${nos[0]}`).check()
  await page.getByRole('button', { name: 'Mark paid out' }).click()
  await expect(page.getByText('Every delivered parcel has been paid out.')).toBeVisible()
  await page.goto('/admin')
  await expect(page.getByTestId('kpi-courier-cost')).toContainText('৳70')

  // E4: a hand-over session — the bulk-sent parcel goes with the rider, once.
  await page.goto('/admin/couriers')
  await page.getByRole('link', { name: 'Parcel scan' }).click()
  await expect(page.getByText('No scan sessions yet.')).toBeVisible()
  await page.getByLabel('Session').selectOption({ label: 'Hand-over to rider' })
  await page.getByLabel('Courier', { exact: true }).selectOption({ label: 'Steadfast' })
  await page.getByLabel('Rider name').fill('Karim')
  await page.getByLabel('Rider phone').fill('01711111111')
  await page.getByRole('button', { name: 'Start scanning' }).click()
  await page.waitForURL(/\/admin\/couriers\/scan\/[0-9a-f-]+$/)
  await expect(page.getByText('Rider name: Karim 01711111111')).toBeVisible()
  const code = page.getByLabel('Scan or type the box code')
  // Camera scanning is offered only where the browser can read barcodes.
  await expect(page.getByRole('button', { name: 'Scan with camera' })).toHaveCount(0)
  await code.fill(`#${nos[1]}`)
  await code.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Added.' })).toBeVisible()
  await expect(page.getByTestId('scan-items')).toContainText(`#${nos[1]}`)
  await code.fill(`#${nos[1]}`)
  await code.press('Enter')
  await alert(page, 'Already scanned in this session.')
  await code.fill('NO-SUCH-BOX')
  await code.press('Enter')
  await alert(page, 'No parcel has this code.')
  await code.fill(`#${nos[0]}`)
  await code.press('Enter')
  await alert(page, 'already delivered or back')
  await expect(page.getByRole('button', { name: 'Print receipt' })).toBeVisible()
  await a11y()

  // E4 returns: the courier brings it back; the camera reads the box and receives it.
  await post({ consignment_id: `LOG-${nos[1]}`, status: 'cancelled' })
  await page.addInitScript((box) => {
    let seen = 0
    Object.assign(window, {
      BarcodeDetector: class {
        async detect() {
          seen++
          return seen < 2 ? [] : [{ rawValue: box }]
        }
      },
    })
    navigator.mediaDevices.getUserMedia = async () => {
      const c = document.createElement('canvas')
      c.width = 8
      c.height = 8
      c.getContext('2d')!.fillRect(0, 0, 8, 8)
      return c.captureStream()
    }
  }, `#${nos[1]}`)
  await page.goto('/admin/couriers/scan')
  await page.getByLabel('Session').selectOption({ label: 'Returns received' })
  await page.getByLabel('Courier', { exact: true }).selectOption({ label: 'Steadfast' })
  await page.getByRole('button', { name: 'Start scanning' }).click()
  await page.waitForURL(/\/admin\/couriers\/scan\/[0-9a-f-]+$/)
  await expect(page.getByTestId('scan-outstanding')).toContainText('Still not back: 1')
  // A full load hydrates the camera button from the server render (no camera there).
  await page.reload()
  await page.getByRole('button', { name: 'Scan with camera' }).click()
  await expect(page.getByTestId('scan-items')).toContainText(`#${nos[1]}`)
  await expect(page.getByTestId('scan-outstanding')).toContainText('Still not back: 0')
  await page.getByRole('button', { name: 'Stop camera' }).click()
  // Leaving within the app unmounts the scanner.
  await page.getByRole('link', { name: 'Parcel scan' }).click()
  await page.waitForURL(/\/admin\/couriers\/scan$/)
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  for (const bad of ['not-a-session', '00000000-0000-4000-8000-000000000000'])
    expect((await page.goto(`/admin/couriers/scan/${bad}`))!.status()).toBe(404)
  await page.goto('/admin/couriers/scan')
  await expect(page.getByTestId('scan-sessions').getByRole('listitem')).toHaveCount(2)
  await expect(page.getByTestId('scan-sessions')).toContainText('1 parcels')

  await page.goto('/admin/couriers')
  await page.getByRole('button', { name: 'Remove Outside Dhaka' }).click()
  await expect(accounts.getByRole('listitem')).toHaveCount(1)
})

test('courier score: delivered vs returned per phone, then hold or ask for a code (D2)', async ({
  page,
  a11y,
}) => {
  const name = `Score ${uid()}`
  const phone = `016${Date.now().toString().slice(-8)}`
  await signedIn(page)
  await page.goto('/admin/fraud')
  await expect(page.getByText(/Courier score: see each customer/)).toBeVisible()
  // Saving the guard without the module keeps the (off) score rule.
  await page.getByRole('button', { name: 'Save' }).first().click()
  await saved(page)

  await createProduct(page, { name, price: '300', stock: '20' })
  const place = async () => {
    await page.goto(`/p/${slug(name)}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.goto('/checkout')
    await fillCheckout(page, phone)
    await page.getByRole('button', { name: 'Place order' }).click()
  }
  const placed = async () => {
    await page.waitForURL(/\/order\/\d+$/)
    return (await page.getByTestId('order-no').textContent())!.replace('#', '')
  }
  const open = async (no: string) => {
    await page.goto(`/admin/orders?q=${no}`)
    await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
    await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+$/)
  }
  const steps = async (no: string, last: string) => {
    await open(no)
    for (const s of ['Confirm order', 'Start processing', 'Mark shipped', last]) {
      await page.getByRole('button', { name: s }).click()
      await expect(page.getByRole('button', { name: s })).toHaveCount(0)
    }
  }
  // One delivered, one the courier brought back: 50%.
  await place()
  await steps(await placed(), 'Mark delivered')
  await place()
  await steps(await placed(), 'Courier is returning it')

  await page.context().clearCookies()
  await signedIn(page, e2eEnv.BOOTSTRAP_SUPER_EMAIL, e2eEnv.BOOTSTRAP_SUPER_PASSWORD)
  await page.goto('/admin/plan')
  await page.getByTestId('feature-fraudCheck').getByRole('button', { name: 'Grant' }).click()
  await expect(page.getByTestId('feature-fraudCheck')).toContainText('Included')
  await page.goto('/admin/features')
  await page.getByTestId('module-fraudCheck').getByRole('button', { name: 'Turn on' }).click()
  await expect(page.getByTestId('module-fraudCheck')).toContainText('On')

  await page.goto(`/admin/orders?q=${phone}`)
  const score = page.getByTestId('courier-score').first()
  await expect(score).toHaveText('Courier score 50% · 1 of 2 delivered')
  await expect(score).toHaveAttribute('data-risky', 'true')
  await page.goto('/admin/orders')
  await expect(page.getByText('Courier score: no deliveries yet').first()).toBeVisible()

  // Rule: under 60% after 2 finished deliveries → hold.
  await page.goto('/admin/fraud')
  await page.getByLabel(/^Act below this success %/).fill('60')
  await page.getByLabel('Only after this many finished deliveries').fill('2')
  await page.getByLabel('Then', { exact: true }).selectOption({ label: 'Put the order on hold' })
  await page.getByRole('button', { name: 'Save' }).first().click()
  await saved(page)
  await a11y()
  await place()
  const held = await placed()
  await open(held)
  await expect(page.getByText('On hold', { exact: true }).first()).toBeVisible()
  await expect(page.getByTestId('courier-score')).toHaveText('Courier score 50% · 1 of 2 delivered')

  // …or ask this phone for an SMS code first.
  await page.goto('/admin/fraud')
  await page.getByLabel('Then', { exact: true }).selectOption({ label: 'Ask for an SMS code' })
  await page.getByRole('button', { name: 'Save' }).first().click()
  await saved(page)
  await place()
  await expect(page.getByText(`We sent a 6-digit code to •••••••${phone.slice(-3)}`)).toBeVisible()
  await page.getByLabel('Verification code').fill(lastCode(phone))
  await page.getByRole('button', { name: 'Verify & place order' }).click()
  await placed()

  await page.goto('/admin/fraud')
  await page.getByLabel(/^Act below this success %/).fill('0')
  await page.getByRole('button', { name: 'Save' }).first().click()
  await saved(page)
})

test('tracking: Meta + TikTok pixels with server events, GTM, GA4, Clarity, verification (H1, H2, H3)', async ({
  page,
  a11y,
  playwright,
}) => {
  const name = `Pixel ${uid()}`
  const serverEvents = (channel: string) =>
    readFileSync('.e2e/notify.log', 'utf8')
      .trim()
      .split('\n')
      .filter((l) => l.includes(`"channel":"${channel}"`))
      .join('\n')
  const queued = () =>
    page.evaluate(() => {
      const w = window as unknown as { fbq: { queue: ArrayLike<unknown>[] }; ttq: unknown[][] }
      // Meta's stub queues `arguments` objects.
      return {
        fbq: JSON.stringify(w.fbq.queue.map((a) => Array.from(a))),
        ttq: JSON.stringify(w.ttq),
      }
    })
  const order = async () => {
    await page.goto(`/p/${slug(name)}`)
    await page.getByRole('button', { name: 'Order now' }).click()
    await page.waitForURL(/\/checkout$/)
    await fillCheckout(page)
    await page.getByRole('button', { name: 'Place order' }).click()
    await page.waitForURL(/\/order\/\d+$/)
    return (await page.getByTestId('order-no').textContent())!.replace('#', '')
  }
  const field = (label: string) => page.getByLabel(label, { exact: true })
  const save = async () => {
    await page.getByRole('button', { name: 'Save' }).click()
    await saved(page)
  }
  await signedIn(page)
  await createProduct(page, { name, price: '450', stock: '9' })
  await editProduct(page, name)
  await uploadPhoto(page)
  await page.goto('/admin/store')
  await page.getByLabel('Phone', { exact: true }).fill('01711 234567')
  await save()
  await page.goto('/admin/seo')
  await page.getByLabel('Google Analytics 4 Measurement ID').fill('G-TEST12345')
  await save()

  await page.goto('/admin/tracking')
  await expect(page.getByRole('heading', { level: 1, name: 'Tracking & pixels' })).toBeVisible()
  await field('Meta Pixel IDs (comma-separated)').fill('11112222, 33334444')
  await field('Facebook domain verification code').fill('fbverify1')
  await field('TikTok Pixel ID').fill('CTIKTOK1')
  await field('TikTok Events API access token').fill('tt-secret')
  await page.getByLabel('Send Purchase when the order is').nth(1).selectOption('placed')
  await field('Google Tag Manager container ID').fill('GTM-TEST1')
  await field('Extra GA4 measurement IDs (comma-separated)').fill('G-EXTRA1')
  await field('Microsoft Clarity project ID').fill('clar1ty')
  await field('Google Search Console verification code').fill('gsc-code_1')
  await save()
  // No CAPI token yet: Purchase can only go from the browser, at once.
  await expect(page.getByTestId('meta-fallback')).toBeVisible()
  await expect(page.getByTestId('ga4-double')).toBeVisible()
  await expect(page.getByPlaceholder('A token is saved. Leave empty to keep it.')).toHaveCount(1)
  await a11y()
  const download = page.waitForEvent('download')
  await page.getByRole('link', { name: /^Download GTM container/ }).click()
  const gtm = await download
  expect(gtm.suggestedFilename()).toBe('rlc-gtm-container.json')
  expect(readFileSync((await gtm.path())!, 'utf8')).toContain('GTM-TEST1')
  const anon = await playwright.request.newContext({ baseURL: page.url() })
  expect((await anon.get('/admin/tracking/gtm-container')).status()).toBe(403)
  await anon.dispose()

  // H10: catalog feeds, linked from this page.
  await expect(page.getByRole('link', { name: '/feeds/products.xml' })).toBeVisible()
  const xml = await (await page.request.get('/feeds/products.xml')).text()
  expect(xml).toContain(`<title>${name}</title>`)
  expect(xml).toContain('<g:price>450.00 BDT</g:price>')
  expect(xml).toMatch(/<g:image_link>http:\/\/[^<]+\/api\/media\/[\w-]+<\/g:image_link>/)
  const csv = await (await page.request.get('/feeds/products.csv')).text()
  expect(csv).toContain(`,${name},`)

  // Storefront: verification tags, every tool's queue at once, the libraries a moment later.
  await page.goto('/')
  await expect(page.locator('meta[name="facebook-domain-verification"]')).toHaveAttribute(
    'content',
    'fbverify1',
  )
  await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute(
    'content',
    'gsc-code_1',
  )
  for (const src of [
    'gtag/js?id=G-TEST12345',
    'gtm.js?id=GTM-TEST1',
    'connect.facebook.net/en_US/fbevents.js',
    'analytics.tiktok.com/i18n/pixel/events.js?sdkid=CTIKTOK1',
    'www.clarity.ms/tag/clar1ty',
  ])
    await expect(page.locator(`script[src*="${src}"]`)).toBeAttached({ timeout: 5000 })
  const boot = await queued()
  expect(boot.fbq).toContain('["init","11112222"]')
  expect(boot.fbq).toContain('["init","33334444"]')
  expect(boot.fbq).toContain('["track","PageView"]')
  expect(boot.ttq).toContain('["page"]')
  // A contact tap is an event too (the call itself is not placed from a test).
  await page.locator('details > summary').filter({ hasText: 'Help' }).click()
  await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault()))
  await page.getByRole('link', { name: 'Call us' }).click()
  expect((await queued()).fbq).toContain('["track","Contact"')

  // Placed: the browser sends Meta's Purchase; TikTok's browser and server both send (same id).
  const first = await order()
  const id1 = `order-${first}`
  const atOrder = await queued()
  expect(atOrder.fbq).toContain(`"Purchase"`)
  expect(atOrder.fbq).toContain(`{"eventID":"${id1}","event_id":"${id1}"}`)
  expect(atOrder.ttq).toContain(`["track","CompletePayment"`)
  expect(atOrder.ttq).toContain(id1)
  expect(
    await page.evaluate(
      (id) => (window.dataLayer ?? []).some((e) => (e as { event_id?: string }).event_id === id),
      id1,
    ),
  ).toBe(true)
  await expect.poll(() => serverEvents('tracking:tiktok')).toContain(id1)

  // With a CAPI token Purchase waits for the confirmation, from the server only.
  await page.goto('/admin/tracking')
  await field('Conversions API access token').fill('meta-secret')
  await field('Test event code').fill('TEST42')
  await save()
  await expect(page.getByTestId('meta-fallback')).toHaveCount(0)
  const second = await order()
  expect((await queued()).fbq).not.toContain(`order-${second}`)
  expect(serverEvents('tracking:meta')).not.toContain(`order-${second}`)
  await page.goto(`/admin/orders?q=${second}`)
  await page.getByRole('link', { name: new RegExp(`#${second}`) }).click()
  await page.getByRole('button', { name: 'Confirm order' }).click()
  await expect(page.getByRole('button', { name: 'Confirm order' })).toHaveCount(0)
  await expect.poll(() => serverEvents('tracking:meta')).toContain(`order-${second}`)
  expect(serverEvents('tracking:meta')).toContain('"test_event_code":"TEST42"')

  // GTM only: no pixel script from the shop; tokens removed, ids cleared.
  await page.goto('/admin/tracking')
  await page.getByLabel('Who sends Meta events').selectOption('gtm')
  await page.getByLabel('Remove the saved token').first().check()
  await page.getByLabel('Remove the saved token').last().check()
  await save()
  await expect(page.getByPlaceholder('A token is saved. Leave empty to keep it.')).toHaveCount(0)
  await page.goto('/')
  await expect(page.locator('script[src*="gtm.js?id=GTM-TEST1"]')).toBeAttached({ timeout: 5000 })
  expect(await page.evaluate(() => 'fbq' in window)).toBe(false)

  await page.goto('/admin/tracking')
  for (const l of [
    'Meta Pixel IDs (comma-separated)',
    'Facebook domain verification code',
    'Test event code',
    'TikTok Pixel ID',
    'Google Tag Manager container ID',
    'Extra GA4 measurement IDs (comma-separated)',
    'Microsoft Clarity project ID',
    'Google Search Console verification code',
  ])
    await field(l).fill('')
  await page.getByLabel('Who sends Meta events').selectOption('site')
  await save()
  await page.goto('/admin/seo')
  await page.getByLabel('Google Analytics 4 Measurement ID').fill('')
  await save()
})

test('shop search forgives typos, never dead-ends; checkout says why it needs the phone; setup checklist', async ({
  page,
  a11y,
}) => {
  const name = `Silk Shawl ${uid()}`
  await signedIn(page)
  await createProduct(page, { name, price: '900', stock: '3', sku: `SH-${Date.now()}` })

  // Words in any order, with a slip, still find it.
  await page.goto('/search?q=shawll%20silk')
  await expect(page.getByRole('link', { name }).first()).toBeVisible()
  // Nothing fits: tips, a corrected search, the categories and what is new — no dead end.
  await page.goto('/search?q=silk%20sjawk')
  const none = page.getByTestId('no-results')
  await expect(none).toContainText('Check the spelling')
  await expect(none.getByRole('heading', { name: 'New arrivals' })).toBeVisible()
  await a11y()
  await none.getByRole('link', { name: 'silk shawl', exact: true }).click()
  await expect(page).toHaveURL(/q=silk%20shawl/)
  await expect(page.getByRole('link', { name }).first()).toBeVisible()

  await page.getByRole('link', { name }).first().click()
  await page.getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)
  await expect(page.getByLabel('Phone number')).toHaveAccessibleDescription(
    'The courier calls this number before delivery. We never share it.',
  )

  await page.goto('/admin')
  for (const step of [
    'Add your shop phone and address',
    'Publish your return and delivery policy pages',
  ])
    await expect(page.getByRole('link', { name: step })).toBeVisible()
})

test('landing pages: build from a product, edit blocks, packs and inline order, stats, hide, copy, prefix (H5)', async ({
  page,
  a11y,
}) => {
  test.setTimeout(120_000)
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  const id = uid()
  const [attar, kurta] = [`Attar ${id}`, `Kurta ${id}`]
  const [lpA, lpB] = [slug(`offer ${id}`), slug(`kurta ${id}`)]
  const saveBlocks = async () => {
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
  }
  await signedIn(page)
  await page.goto('/admin/landing')
  await expect(page.getByText(/Landing pages are a paid feature/)).toBeVisible()
  expect((await page.goto(`/offer/${lpA}`))!.status()).toBe(404)

  await page.context().clearCookies()
  await signedIn(page, e2eEnv.BOOTSTRAP_SUPER_EMAIL, e2eEnv.BOOTSTRAP_SUPER_PASSWORD)
  await page.goto('/admin/plan')
  await page.getByTestId('feature-landingPages').getByRole('button', { name: 'Grant' }).click()
  await expect(page.getByTestId('feature-landingPages')).toContainText('Included')
  await page.goto('/admin/features')
  await page.getByTestId('module-landingPages').getByRole('button', { name: 'Turn on' }).click()
  await expect(page.getByTestId('module-landingPages')).toContainText('On')

  await createProduct(page, {
    name: attar,
    price: '1000',
    compareAt: '1200',
    stock: '20',
    description: 'Long lasting rose attar.',
  })
  await editProduct(page, attar)
  await uploadPhoto(page)
  await uploadPhoto(page, '#7a2e10')
  await createProduct(page, { name: kurta, price: '900', stock: '5' })
  await editProduct(page, kurta)
  await page.getByLabel('Options', { exact: true }).fill('Size: M, L')
  await page.getByRole('button', { name: 'Apply options' }).click()
  await expect(page.getByRole('rowheader').first()).toBeVisible()

  // A: filled from the product, night design, video + countdown on.
  const create = async (product: string, title: string, address: string, design: string) => {
    await page.goto('/admin/landing')
    await page
      .getByRole('combobox', { name: 'Product', exact: true })
      .selectOption({ label: product })
    await page
      .getByRole('combobox', { name: 'Design', exact: true })
      .first()
      .selectOption({ label: design })
    await page.getByLabel('Page title').fill(title)
    await page.getByLabel(/^Address \(after/).fill(address)
    await page.getByRole('button', { name: 'Create page' }).click()
    await page.waitForURL(/\/admin\/landing\/[0-9a-f-]{36}$/)
  }
  await create(attar, `Eid ${id}`, lpA, 'Night')
  await a11y()
  await expect(page.getByLabel('Top banner — heading')).toHaveValue(attar)
  await page.getByLabel('Show Video').check()
  await page
    .getByLabel('YouTube or Facebook video link')
    .fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  await page.getByLabel('Offer ends (countdown)').fill('2030-01-01T10:00')
  await page.getByLabel('Benefits — heading').fill('All you get')
  // Moving a block saves the page too; the first block cannot go higher.
  await page.getByRole('button', { name: 'Move Top banner up' }).click()
  await page.getByRole('button', { name: 'Move Video down' }).click()
  await expect(page.getByRole('heading', { level: 2 }).nth(2)).toHaveText('Video')
  await expect(page.getByLabel('Offer ends (countdown)')).toHaveValue('2030-01-01T10:00')

  await page.goto(`/offer/${lpA}`)
  await expect(page.getByRole('heading', { level: 1, name: attar })).toBeVisible()
  await expect(page.locator('[data-landing="night"]')).toBeVisible()
  await expect(page.locator('header').first()).toBeHidden()
  await expect(page.getByRole('timer')).toContainText(/Offer ends in \d+:\d\d:\d\d/)
  await expect(page.getByRole('button', { name: 'Play video' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'All you get' })).toBeVisible()
  await page.getByText('How long does delivery take?').click()
  await expect(page.getByText('1–2 days in Dhaka')).toBeVisible()
  await a11y()
  // Leaving through the top shows the offer once per visit; other mouse-outs never do.
  const leave = (clientY: number, related: boolean) =>
    page.evaluate(
      ([y, r]) =>
        document.dispatchEvent(
          new MouseEvent('mouseout', {
            clientY: y as number,
            relatedTarget: r ? document.body : null,
          }),
        ),
      [clientY, related] as const,
    )
  await leave(200, false)
  await leave(-5, true)
  await expect(page.getByRole('dialog')).toBeHidden()
  await leave(-5, false)
  await page.getByRole('dialog').getByRole('link', { name: 'Order now' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await leave(-5, false)
  await expect(page.getByRole('dialog')).toBeHidden()

  // Pack of 2 at 5% off, then 3 at 10% (৳300 off); the shopper's cart stays as it was.
  await page.getByRole('radio', { name: /^2 pcs/ }).check()
  await expect(page.getByTestId('checkout-discount')).toContainText('Pack saving')
  await page
    .getByRole('group', { name: `Quantity: ${attar}` })
    .getByRole('button', { name: '+' })
    .click()
  await expect(page.getByTestId('checkout-discount')).toContainText('300')
  await fillCheckout(page)
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)

  // B: a product with sizes sends shoppers to its own page; owner text overrides defaults.
  await create(kurta, `Kurta ${id}`, lpB, 'Fresh green')
  for (const [label, value] of [
    ['Top banner — heading', ''],
    ['Price & countdown — heading', ''],
    ['Order form — heading', ''],
    ['Sticky order bar — heading', ''],
    ['Us vs others — heading', 'Side by side'],
    ['Delivery charges — heading', 'Delivery'],
    ['Questions (FAQ) — heading', 'Ask us'],
    ['Guarantee — heading', 'Promise'],
    ['Delivery charges — text', ''],
  ])
    await page.getByRole('textbox', { name: label!, exact: true }).fill(value!)
  await page.getByLabel('Show Video').check()
  await page.getByLabel("Show the shop's header and footer").check()
  await page.getByLabel('Offer ends (countdown)').fill('2020-01-01T10:00')
  await saveBlocks()
  await page.goto(`/${'offer'}/${lpB}`)
  await expect(page.locator('header').first()).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: kurta })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Choose size or colour' })).toHaveAttribute(
    'href',
    `/p/${slug(kurta)}`,
  )
  await expect(page.getByRole('heading', { name: 'Side by side' })).toBeVisible()
  await expect(page.getByTestId('landing-sticky')).toBeVisible()
  await expect(page.getByRole('timer')).toHaveText('This offer has ended')
  // Leaving by a shop link (client navigation) stops the timer and the leaving popup.
  await page.locator('header').first().getByRole('link').first().click()
  await expect(page).toHaveURL(/\/$/)
  for (const bad of ['not-an-id', '00000000-0000-4000-8000-000000000000'])
    expect((await page.goto(`/admin/landing/${bad}`))!.status()).toBe(404)

  // Stats, search, design filter, hide and show.
  await page.goto('/admin/landing')
  const rowA = page.getByTestId(`landing-${lpA}`)
  await expect(rowA).toContainText('Night')
  await expect(rowA.getByRole('cell').nth(3)).toHaveText('1')
  await expect(rowA.getByRole('cell').nth(4)).toHaveText(/%$/)
  await page.goto('/admin/landing?q=nothing-like-this')
  await expect(page.getByText('No landing pages yet')).toBeVisible()
  await page.goto('/admin/landing?design=fresh')
  await expect(page.getByTestId(`landing-${lpB}`)).toBeVisible()
  await expect(page.getByTestId(`landing-${lpA}`)).toHaveCount(0)
  await page.goto('/admin/landing')
  await rowA.getByRole('button', { name: 'Hide' }).click()
  await expect(rowA).toContainText('Hidden')
  expect((await page.goto(`/offer/${lpA}`))!.status()).toBe(404)
  await page.goto('/admin/landing')
  await rowA.getByRole('button', { name: 'Show' }).click()
  await expect(rowA).not.toContainText('Hidden')

  // A hidden copy to try changes on: packs off, then shown; deleted afterwards.
  await rowA.getByRole('button', { name: 'Copy' }).click()
  await page.waitForURL(/\/admin\/landing\/[0-9a-f-]{36}$/)
  await expect(page.getByLabel('Page title')).toHaveValue(`Eid ${id} (copy)`)
  await page.getByLabel('Show Pack offers').uncheck()
  await page.getByLabel('Hidden from shoppers').uncheck()
  await saveBlocks()
  await page.goto('/admin/landing')
  // Nobody has seen the copy yet: no conversion to show.
  await expect(page.getByTestId(`landing-${lpA}-copy`).getByRole('cell').nth(4)).toHaveText('—')
  await page.goto(`/offer/${lpA}-copy`)
  await expect(page.getByRole('radio', { name: /pcs/ })).toHaveCount(0)
  await expect(
    page.getByRole('group', { name: `Quantity: ${attar}` }).locator('output'),
  ).toHaveText('1')
  await page.goto('/admin/landing')
  await page.getByTestId(`landing-${lpA}-copy`).getByRole('link').click()
  await page.getByLabel('Yes, delete this page').check()
  await page.getByRole('button', { name: 'Delete page' }).click()
  await page.waitForURL(/\/admin\/landing$/)
  await expect(page.getByTestId(`landing-${lpA}-copy`)).toHaveCount(0)

  // The address prefix: shop paths are refused; a new one moves every page.
  const prefix = async (value: string) => {
    await page.goto('/admin/landing')
    await page.getByLabel(/^Address prefix/).fill(value)
    await page.getByRole('button', { name: 'Save' }).last().click()
  }
  await prefix('checkout')
  await expect(page.getByRole('alert')).toBeVisible()
  await prefix('deals')
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
  await page.goto(`/deals/${lpB}`)
  await expect(page.getByRole('heading', { level: 1, name: kurta })).toBeVisible()
  expect((await page.goto(`/offer/${lpB}`))!.status()).toBe(404)
  expect((await page.goto(`/deals/no-such-page`))!.status()).toBe(404)
  await prefix('offer')
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
})
