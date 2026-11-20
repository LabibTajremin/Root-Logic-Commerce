import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { signedIn } from './admin'
import { createCategory, createProduct, fillCheckout, slug, uid } from './shop'

const drawer = (page: Page) => page.getByRole('dialog', { name: 'Cart' })
const alert = (page: Page, text: string | RegExp) =>
  expect(page.getByRole('alert').filter({ hasText: text })).toBeVisible()
const ld = async (page: Page) =>
  (await page.locator('script[type="application/ld+json"]').textContent())!
const placeOrder = async (page: Page) => {
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.waitForURL(/\/order\/\d+$/)
  return (await page.getByTestId('order-no').textContent())!.replace('#', '')
}

test('shopper browses, carts, checks out and tracks; owner confirms then cancels', async ({
  page,
  a11y,
}) => {
  const id = uid()
  const tea = `Tea ${id}`
  const honey = `Honey ${id}`
  await signedIn(page)
  await createCategory(page, `Drinks ${id}`)
  await createProduct(page, {
    name: tea,
    price: '500',
    compareAt: '650',
    stock: '3',
    sku: `TEA-${id}`,
    category: `Drinks ${id}`,
    seoTitle: `Best tea ${id}`,
    description: 'Fresh leaves\nfrom Sylhet',
  })
  await createProduct(page, { name: honey, price: '300', stock: '5' })

  await page.goto('/')
  await expect(page.getByRole('link', { name: tea }).first()).toBeVisible()
  await a11y()
  await page
    .getByRole('navigation', { name: 'All products' })
    .getByRole('link', { name: `Drinks ${id}` })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: `Drinks ${id}` })).toBeVisible()
  await expect(page.getByRole('link', { name: honey })).toHaveCount(0)
  await a11y()

  await page.getByRole('link', { name: tea }).first().click()
  await expect(page).toHaveTitle(new RegExp(`Best tea ${id}`))
  await expect(page.getByRole('heading', { level: 1, name: tea })).toBeVisible()
  expect(JSON.parse(await ld(page))).toMatchObject({
    '@type': 'Product',
    sku: `TEA-${id}`,
    category: `Drinks ${id}`,
    offers: { price: '500.00', availability: 'https://schema.org/InStock' },
  })
  await a11y()
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(drawer(page)).toBeVisible()
  await drawer(page)
    .getByRole('group', { name: `Quantity: ${tea}` })
    .getByRole('button', { name: '+' })
    .click()
  await expect(page.getByTestId('cart-subtotal')).toHaveText('৳1,000')
  await a11y()
  await drawer(page).getByRole('button', { name: 'Continue shopping' }).click()
  await expect(page.getByRole('button', { name: 'Cart 2' })).toBeVisible()

  await page.goto(`/p/${slug(honey)}`)
  expect(await ld(page)).not.toContain('"sku"')
  await page.getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)
  await expect(page.getByTestId('checkout-total')).toHaveText('৳1,360')
  await a11y()
  await fillCheckout(page)
  await page.getByLabel('Outside Dhaka').check()
  await expect(page.getByTestId('checkout-total')).toHaveText('৳1,430')
  await page.getByLabel('Email (optional)').fill('rahim@example.com')
  await page.getByLabel('Order note (optional)').fill('Call before coming')
  const no = await placeOrder(page)
  await a11y()
  await expect(page.getByRole('button', { name: 'Cart', exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Track my order' }).first().click()
  await expect(page.getByLabel('Order number')).toHaveValue(no)
  await page.getByLabel('Phone number').fill('01812345678')
  await page.getByRole('button', { name: 'Track order' }).click()
  await alert(page, 'No order found with that number and phone.')
  await page.getByLabel('Phone number').fill('+880 1712-345678')
  await page.getByRole('button', { name: 'Track order' }).click()
  await expect(page.getByTestId('track-status')).toHaveText('Pending')
  await expect(page.getByRole('region', { name: `#${no}` })).toContainText(`${tea} × 2`)
  await a11y()
  await page.getByRole('link', { name: 'বাং' }).click()
  await page.getByLabel('অর্ডার নম্বর').fill(no)
  await page.getByLabel('ফোন নম্বর').fill('01712345678')
  await page.getByRole('button', { name: 'ট্র্যাক করুন' }).click()
  await expect(page.getByTestId('track-status')).toHaveText('অপেক্ষমাণ')
  await page.getByRole('link', { name: 'EN' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Track my order' })).toBeVisible()

  await page.goto('/admin/orders')
  await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
  await expect(page.getByTestId('order-total')).toHaveText('৳1,430')
  // A tampered status is ignored rather than trusted.
  const confirm = page.getByRole('button', { name: 'Confirm order' })
  await confirm.evaluate((b: HTMLButtonElement) => (b.value = 'BOGUS'))
  await confirm.click()
  await page.reload()
  await expect(page.getByTestId('order-events')).not.toContainText('Confirmed')
  await page.getByRole('button', { name: 'Confirm order' }).click()
  await expect(page.getByRole('button', { name: 'Start processing' })).toBeVisible()
  await page.goto(`/p/${slug(tea)}`)
  expect(await ld(page)).toContain('/InStock')
  await page.goto(`/admin/stock`)
  await expect(
    page.getByLabel('Product', { exact: true }).locator('option', { hasText: tea }),
  ).toHaveText(`${tea} (1)`)
  await page.goto(`/admin/orders?q=${no}`)
  await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
  await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}$/)
  const orderUrl = page.url()
  await page.getByRole('link', { name: 'Print invoice' }).click()
  await expect(page.getByText(`Invoice #${no}`)).toBeVisible()
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute('data-printed', '1')
  })
  await page.getByRole('button', { name: 'Print invoice' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-printed', '1')
  await page.goto(orderUrl)
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByTestId('order-events')).toContainText('Cancelled')
  await page.goto(`/admin/stock`)
  await expect(
    page.getByLabel('Product', { exact: true }).locator('option', { hasText: tea }),
  ).toHaveText(`${tea} (3)`)
})

test('cart and checkout edge cases', async ({ page, a11y }) => {
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  const id = uid()
  const last = `Last ${id}`
  const gone = `Gone ${id}`
  await signedIn(page)
  await createProduct(page, { name: last, price: '120', stock: '1' })
  await createProduct(page, { name: `Sold ${id}`, price: '90', stock: '0' })
  await createProduct(page, { name: gone, price: '80', stock: '4' })

  // Corrupt storage is dropped, not a crash.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('rlc-cart', '{oops')
      sessionStorage.setItem('seeded', '1')
    }
  })
  await page.goto('/checkout')
  await expect(page.getByText('Your cart is empty — add something first.')).toBeVisible()
  await page.getByRole('link', { name: 'Continue shopping' }).click()
  await page.getByRole('button', { name: 'Cart', exact: true }).click()
  await expect(drawer(page).getByText('Your cart is empty.')).toBeVisible()
  await drawer(page).getByRole('button', { name: 'Cancel' }).click()

  await page.goto(`/search?q=${encodeURIComponent(id)}`)
  await expect(page.getByRole('status')).toHaveText(`3 results for “${id}”`)
  await expect(page.getByText('Sold out').first()).toBeVisible()
  await a11y()
  await page.goto(`/p/${slug(`Sold ${id}`)}`)
  await expect(page.getByRole('button', { name: 'Add to cart' })).toHaveCount(0)
  expect(await ld(page)).toContain('OutOfStock')

  // Two lines: grid add-to-cart for one, then the other; adjust and remove.
  await page.goto(`/search?q=${encodeURIComponent(last)}`)
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await drawer(page)
    .getByRole('group', { name: `Quantity: ${last}` })
    .getByRole('button', { name: '+' })
    .click()
  await drawer(page).getByRole('button', { name: 'Continue shopping' }).click()
  await page.goto(`/search?q=${encodeURIComponent(gone)}`)
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await drawer(page)
    .getByRole('group', { name: `Quantity: ${gone}` })
    .getByRole('button', { name: '+' })
    .click()
  await drawer(page)
    .getByRole('group', { name: `Quantity: ${gone}` })
    .getByRole('button', { name: '−' })
    .click()
  await drawer(page)
    .getByRole('group', { name: `Quantity: ${gone}` })
    .getByRole('button', { name: '−' })
    .click()
  await expect(drawer(page).getByRole('link', { name: gone })).toHaveCount(0)
  await drawer(page).getByRole('button', { name: 'Continue shopping' }).click()
  await page.goto(`/search?q=${encodeURIComponent(gone)}`)
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await drawer(page)
    .getByRole('group', { name: `Quantity: ${gone}` })
    .getByRole('button', { name: 'Remove' })
    .click()
  await page.goto(`/search?q=${encodeURIComponent(gone)}`)
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await drawer(page).getByRole('link', { name: gone }).click()
  await expect(page.getByRole('heading', { level: 1, name: gone })).toBeVisible()
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(
    drawer(page)
      .getByRole('group', { name: `Quantity: ${gone}` })
      .locator('output'),
  ).toHaveText('2')
  await drawer(page)
    .getByRole('group', { name: `Quantity: ${gone}` })
    .getByRole('button', { name: '−' })
    .click()
  await drawer(page).getByRole('button', { name: 'Continue shopping' }).click()
  await page.getByRole('button', { name: 'Cart 3' }).click()
  await drawer(page).getByRole('link', { name: 'Checkout' }).click()
  await page.waitForURL(/\/checkout$/)

  await fillCheckout(page)
  await page.getByRole('button', { name: 'Place order' }).click()
  await alert(page, /Not enough stock/)
  // A tampered payload gets a friendly retry hint, never a 500.
  await page.locator('input[name="items"]').evaluate((e: HTMLInputElement) => (e.value = 'nope'))
  await page.getByRole('button', { name: 'Place order' }).click()
  await alert(page, 'Something went wrong. Please try again.')
  await page.evaluate(() => {
    const lines = JSON.parse(localStorage.getItem('rlc-cart')!) as { id: string }[]
    lines[0]!.id = '00000000-0000-4000-8000-000000000000'
    localStorage.setItem('rlc-cart', JSON.stringify(lines))
  })
  await page.reload()
  await fillCheckout(page)
  await page.getByRole('button', { name: 'Place order' }).click()
  await alert(page, 'A product in your cart is no longer available.')

  for (const url of ['/p/nope', '/c/nope', '/order/abc', '/no/such/page']) {
    await page.goto(url)
    await expect(page.getByRole('heading', { name: 'This page wandered off' })).toBeVisible()
  }
  await a11y()
  await page.getByRole('link', { name: 'Back to home' }).click()
  await page.goto('/search')
  await expect(page.getByRole('navigation', { name: 'All products' })).toBeVisible()
  await page.goto('/track')
  await expect(page.getByLabel('Order number')).toHaveValue('')
})

test('robots.txt and sitemap.xml use the store origin', async ({ page, request }) => {
  const name = `Mapped ${uid()}`
  await signedIn(page)
  await createCategory(page, name)
  await createProduct(page, { name, price: '10', stock: '1' })
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Disallow: /admin')
  expect(robots).toMatch(/Sitemap: http:\/\/127\.0\.0\.1:3100\/sitemap\.xml/)
  const res = await request.get('/sitemap.xml', { headers: { 'x-forwarded-proto': 'https' } })
  const xml = await res.text()
  expect(xml).toContain('<loc>https://127.0.0.1:3100/</loc>')
  expect(xml).toContain(`<loc>https://127.0.0.1:3100/p/${slug(name)}</loc>`)
  expect(xml).toContain(`<loc>https://127.0.0.1:3100/c/${slug(name)}</loc>`)
  expect(await (await request.get('/sitemap.xml')).text()).toContain(
    '<loc>http://127.0.0.1:3100/</loc>',
  )
  for (const [q, to] of [
    ['to=bn', '/admin'],
    ['to=xx&back=//evil.example', '/admin'],
    ['to=en&back=/track', '/track'],
  ]) {
    const r = await request.get(`/admin/lang?${q}`, { maxRedirects: 0 })
    expect(r.headers().location).toBe(to)
  }
})
