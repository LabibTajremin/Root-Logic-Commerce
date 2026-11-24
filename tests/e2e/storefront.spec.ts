import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { signedIn } from './admin'
import {
  createCategory,
  createProduct,
  editProduct,
  fillCheckout,
  photo,
  slug,
  uid,
  uploadPhoto,
} from './shop'

const drawer = (page: Page) => page.getByRole('dialog', { name: 'Cart' })
const alert = (page: Page, text: string | RegExp) =>
  expect(page.getByRole('alert').filter({ hasText: text })).toBeVisible()
const ld = async (page: Page, type = 'Product') =>
  (await page.locator('script[type="application/ld+json"]').allTextContents()).find((s) =>
    s.includes(`"@type":"${type}"`),
  )!
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
  expect(JSON.parse(await ld(page, 'Organization'))).toMatchObject({ url: expect.any(String) })
  await a11y()
  await page
    .getByRole('navigation', { name: 'All products' })
    .getByRole('link', { name: `Drinks ${id}` })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: `Drinks ${id}` })).toBeVisible()
  await expect(page.getByRole('link', { name: honey })).toHaveCount(0)
  expect(JSON.parse(await ld(page, 'BreadcrumbList')).itemListElement).toHaveLength(2)
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
  expect(
    JSON.parse(await ld(page, 'BreadcrumbList')).itemListElement.map(
      (i: { name: string }) => i.name,
    ),
  ).toEqual(['Home', `Drinks ${id}`, tea])
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
  // Hydrated first: a click before that would fall back to a full page load.
  await page.waitForLoadState('networkidle')
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
  await page.goto(
    (await page.getByRole('link', { name: 'বাং', exact: true }).getAttribute('href'))!,
  )
  await page.getByLabel('অর্ডার নম্বর').fill(no)
  await page.getByLabel('ফোন নম্বর').fill('01712345678')
  await page.getByRole('button', { name: 'ট্র্যাক করুন' }).click()
  await expect(page.getByTestId('track-status')).toHaveText('অপেক্ষমাণ')
  await page.goto((await page.getByRole('link', { name: 'EN', exact: true }).getAttribute('href'))!)
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
  await expect(page.getByRole('status')).toHaveText(`Found 3 for “${id}”`)
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
  const minus = drawer(page)
    .getByRole('group', { name: `Quantity: ${gone}` })
    .getByRole('button', { name: '−' })
  await minus.click()
  await expect(minus).toBeDisabled()
  await drawer(page)
    .getByRole('group', { name: `Quantity: ${gone}` })
    .getByRole('button', { name: 'Remove' })
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
    const lines = JSON.parse(localStorage.getItem('rlc-cart')!) as { productId: string }[]
    lines[0]!.productId = '00000000-0000-4000-8000-000000000000'
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

test('product content tabs: owner fills them, the page shows them, FAQ feeds JSON-LD', async ({
  page,
  a11y,
}) => {
  const name = `Tabbed ${uid()}`
  await signedIn(page)
  await createProduct(page, { name, price: '650', stock: '8', description: 'Hand-woven.' })
  await editProduct(page, name)
  await page.getByLabel('Specifications').fill('Fabric: Cotton\nLength: 12 haat')
  await page.getByLabel('How to use').fill('Wash cold\nDry in shade')
  await page
    .getByLabel('FAQ')
    .fill('Does it shrink?\nNo, it is pre-washed.\n\nIs COD available?\nYes')
  await page.getByLabel('Key benefits').fill('Breathable')
  await page.getByLabel('Why buy from us').fill('Free exchange in 7 days')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  await editProduct(page, name)
  await expect(page.getByLabel('Specifications')).toHaveValue('Fabric: Cotton\nLength: 12 haat')
  await a11y()

  await page.goto(`/p/${slug(name)}`)
  const tab = (t: string) => page.locator('details > summary').filter({ hasText: t })
  await expect(page.locator('details[open]').getByText('Hand-woven.')).toBeVisible()
  await tab('Specifications').click()
  await expect(page.getByRole('definition').filter({ hasText: '12 haat' })).toBeVisible()
  await tab('How to use').click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Dry in shade' })).toBeVisible()
  await tab('Key benefits').click()
  await expect(page.getByText('Breathable')).toBeVisible()
  await tab('Why buy from us').click()
  await expect(page.getByText('Free exchange in 7 days')).toBeVisible()
  await tab('Questions & answers').click()
  await expect(page.getByRole('term').filter({ hasText: 'Is COD available?' })).toBeVisible()
  const faq = JSON.parse(await ld(page, 'FAQPage'))
  expect(faq.mainEntity[0]).toEqual({
    '@type': 'Question',
    name: 'Does it shrink?',
    acceptedAnswer: { '@type': 'Answer', text: 'No, it is pre-washed.' },
  })
  await a11y()
})

test('brands: owner adds one with a logo, links products; archived brands leave the shop', async ({
  page,
  a11y,
}) => {
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  const id = uid()
  const [maker, old] = [`Maker ${id}`, `Old ${id}`]
  const [made, plain] = [`Made ${id}`, `Plain ${id}`]
  await signedIn(page)
  const addBrand = async (name: string) => {
    await page.goto('/admin/brands')
    await page.getByLabel('Brand name').fill(name)
    await page.getByRole('button', { name: 'Add brand' }).click()
    await expect(page.getByRole('link', { name })).toBeVisible()
  }
  await addBrand(`First ${id}`)
  await page.getByRole('link', { name: `First ${id}` }).click()
  await expect(page.getByRole('heading', { name: 'Edit brand' })).toBeVisible()
  await page.getByLabel('Brand name').fill(maker)
  await page.getByLabel(/^Brand logo/).setInputFiles(await photo('#aa3311'))
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin\/brands$/)
  await expect(page.getByRole('link', { name: maker }).locator('img')).toBeVisible()
  await a11y()
  // Saving without a new file keeps the logo.
  await page.getByRole('link', { name: maker }).click()
  await expect(page.getByRole('heading', { name: 'Edit brand' })).toBeVisible()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin\/brands$/)
  await expect(page.getByRole('link', { name: maker }).locator('img')).toBeVisible()
  await addBrand(old)

  for (const [product, brand] of [
    [made, maker],
    [plain, old],
  ] as const) {
    await createProduct(page, { name: product, price: '200', stock: '3' })
    await editProduct(page, product)
    await page.getByLabel('Brand', { exact: true }).selectOption({ label: brand })
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/\/admin\/products$/)
  }
  await page.goto('/admin/brands')
  await page.getByRole('link', { name: old }).click()
  await expect(page.getByRole('heading', { name: 'Edit brand' })).toBeVisible()
  await page.getByRole('button', { name: 'Archive' }).click()
  await expect(page.getByRole('link', { name: old })).toContainText('Archived')
  // An archived brand stays on the products that use it, but is not offered for new ones.
  await editProduct(page, plain)
  await expect(page.getByLabel('Brand', { exact: true }).locator('option:checked')).toHaveText(old)
  await page.goto('/admin/products/new')
  await expect(
    page.getByLabel('Brand', { exact: true }).getByRole('option', { name: old }),
  ).toHaveCount(0)

  await page.goto(`/p/${slug(made)}`)
  const link = page.getByRole('link', { name: `Brand: ${maker}` })
  expect(JSON.parse(await ld(page)).brand).toEqual({ '@type': 'Brand', name: maker })
  await page.goto((await link.getAttribute('href'))!)
  await expect(page.getByRole('heading', { level: 1, name: maker })).toBeVisible()
  await expect(page.getByRole('link', { name: made }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: plain })).toHaveCount(0)
  await a11y()
  await page.goto(`/p/${slug(plain)}`)
  await expect(page.getByRole('link', { name: /^Brand:/ })).toHaveCount(0)
  expect(JSON.parse(await ld(page)).brand).toBeUndefined()
  const gone = await page.goto(`/b/${slug(old)}`)
  expect(gone!.status()).toBe(404)
})

test('variants: owner sets options and per-variant prices; shopper picks, carts and orders them', async ({
  page,
  a11y,
}) => {
  const id = uid()
  const [kurta, gone] = [`Kurta ${id}`, `Gone ${id}`]
  await signedIn(page)
  const withOptions = async (name: string, options: string) => {
    await createProduct(page, { name, price: '1200', stock: '0' })
    await editProduct(page, name)
    await page.getByLabel('Options', { exact: true }).fill(options)
    await page.getByRole('button', { name: 'Apply options' }).click()
    await expect(page.getByRole('rowheader').first()).toBeVisible()
  }
  await withOptions(kurta, 'Size: M, L\nColour: Red, Blue')
  await expect(page.getByRole('rowheader')).toHaveText([
    'M / Red',
    'M / Blue',
    'L / Red',
    'L / Blue',
  ])
  const set = async (row: string, field: string, value: string) =>
    page.getByLabel(`${field} — ${row}`, { exact: true }).fill(value)
  await set('M / Red', 'Price (৳)', '1500')
  await set('M / Red', 'Compare-at price (৳)', '1800')
  await set('M / Red', 'Stock quantity', '2')
  await set('M / Red', 'SKU (optional)', `K-MR-${id}`)
  await set('L / Red', 'Stock quantity', '1')
  // A blank cost counts as 0.
  await set('L / Red', 'Cost price (৳)', '')
  await page.getByRole('button', { name: 'Update prices and stock' }).click()
  await page.reload()
  await expect(page.getByLabel('Price (৳) — M / Red', { exact: true })).toHaveValue('1500')
  await expect(page.getByLabel('Stock quantity', { exact: true })).toHaveValue('3')
  await a11y()
  await withOptions(gone, 'Size: S')

  await page.goto(`/search?q=${encodeURIComponent(id)}`)
  // Sold-out cards carry no button; the in-stock one sends shoppers to pick an option.
  await expect(page.getByRole('link', { name: 'Choose options' })).toHaveCount(1)
  await page.goto(`/p/${slug(gone)}`)
  await expect(page.getByText('Sold out')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add to cart' })).toHaveCount(0)

  await page.goto(`/p/${slug(kurta)}`)
  await page.waitForLoadState('networkidle')
  const price = page.getByTestId('variant-price')
  await expect(price).toContainText('৳1,500')
  await expect(price.locator('s')).toHaveText('৳1,800')
  await expect(page.getByRole('radio', { name: 'Blue' })).toBeDisabled()
  await a11y()
  await page.getByRole('group', { name: /^Size/ }).getByText('L', { exact: true }).click()
  await expect(page.getByRole('radio', { name: 'L', exact: true })).toBeChecked()
  await expect(price).toHaveText('৳1,200')
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(drawer(page).getByText(`${kurta} (L / Red)`)).toBeVisible()
  await drawer(page).getByRole('button', { name: 'Continue shopping' }).click()
  await page.getByRole('group', { name: /^Size/ }).getByText('M', { exact: true }).click()
  await expect(page.getByRole('radio', { name: 'M', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)
  await expect(page.getByTestId('checkout-total')).toHaveText('৳2,760')
  await fillCheckout(page)
  const no = await placeOrder(page)

  await page.goto('/admin/orders')
  await page
    .getByRole('link', { name: new RegExp(`#${no}`) })
    .first()
    .click()
  await expect(page.getByText(`${kurta} (M / Red)`)).toBeVisible()
  await expect(page.getByText(`${kurta} (L / Red)`)).toBeVisible()
  // Leave no pending order behind: the dashboard test counts them.
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByTestId('order-events')).toContainText('Cancelled')

  // A16: several combinations at once, with quantities and a running total.
  await page.goto(`/p/${slug(kurta)}`)
  await page.waitForLoadState('networkidle')
  const size = (v: string) =>
    page.getByRole('group', { name: /^Size/ }).getByText(v, { exact: true }).click()
  const toList = () => page.getByRole('button', { name: '+ Add this to my list' }).click()
  await size('L')
  await toList()
  await size('M')
  await toList()
  await toList()
  const list = page.getByRole('region', { name: 'Selected' })
  const step = (line: string, b: '+' | '−') =>
    list
      .getByRole('group', { name: `${kurta} (${line})` })
      .getByRole('button', { name: b })
      .click()
  await step('M / Red', '+') // only 2 in stock: stays 2
  await step('L / Red', '−') // never below 1
  await expect(page.getByTestId('picks-total')).toHaveText('৳4,200')
  await a11y()
  await list
    .getByRole('listitem')
    .filter({ hasText: 'L / Red' })
    .getByRole('button', { name: 'Remove' })
    .click()
  await expect(page.getByTestId('picks-total')).toHaveText('৳3,000')
  await list.getByRole('button', { name: 'Add all to cart' }).click()
  await expect(page.getByTestId('cart-subtotal')).toHaveText('৳3,000')
  await expect(list).toHaveCount(0)
})

test('size charts: owner builds one, links it to a category and a product; shoppers open it', async ({
  page,
  a11y,
}) => {
  const id = uid()
  const [chart, temp, cat, inherit, own] = [
    `Kurta chart ${id}`,
    `Temp ${id}`,
    `Tops ${id}`,
    `Inherit ${id}`,
    `Own ${id}`,
  ]
  await signedIn(page)
  const addChart = async (name: string) => {
    await page.goto('/admin/size-charts')
    await page.getByLabel('Chart name').fill(name)
    await page.getByLabel('Table', { exact: true }).fill('Size | Chest\nM | 38\nL | 40')
    await page.getByRole('button', { name: 'Add size chart' }).click()
    await expect(page.getByRole('link', { name })).toBeVisible()
  }
  await addChart(`First ${id}`)
  await page.getByRole('link', { name: `First ${id}` }).click()
  await expect(page.getByRole('heading', { name: 'Edit size chart' })).toBeVisible()
  await page.getByLabel('Chart name').fill(chart)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('link', { name: chart })).toBeVisible()
  await a11y()
  await addChart(temp)
  await page.getByRole('link', { name: temp }).click()
  await expect(page.getByRole('heading', { name: 'Edit size chart' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('link', { name: temp })).toHaveCount(0)

  await createCategory(page, cat)
  await page.getByRole('link', { name: cat }).click()
  await expect(page.getByRole('heading', { name: 'Edit category' })).toBeVisible()
  await page.getByLabel('Size chart').selectOption({ label: chart })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin\/categories$/)
  await page.getByRole('link', { name: cat }).click()
  await expect(page.getByRole('heading', { name: 'Edit category' })).toBeVisible()
  await expect(page.getByLabel('Size chart').locator('option:checked')).toHaveText(chart)

  await createProduct(page, { name: inherit, price: '500', stock: '2', category: cat })
  await createProduct(page, { name: own, price: '500', stock: '2' })
  await editProduct(page, own)
  await page.getByLabel('Size chart').selectOption({ label: chart })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  await editProduct(page, own)
  await expect(page.getByLabel('Size chart').locator('option:checked')).toHaveText(chart)

  for (const name of [inherit, own]) {
    await page.goto(`/p/${slug(name)}`)
    await page.getByRole('button', { name: 'See size chart' }).click()
    const dialog = page.getByRole('dialog', { name: chart })
    await expect(dialog.getByRole('columnheader', { name: 'Chest' })).toBeVisible()
    await expect(dialog.getByRole('cell', { name: '40' })).toBeVisible()
    await a11y()
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()
  }
})

test('listing: filters, sort, page size, pages, grid columns and breadcrumbs (A11)', async ({
  page,
  a11y,
}) => {
  const id = uid()
  const cat = `List ${id}`
  const brand = `Lb ${id}`
  await signedIn(page)
  await createCategory(page, cat)
  await page.goto('/admin/brands')
  await page.getByLabel('Brand name').fill(brand)
  await page.getByRole('button', { name: 'Add brand' }).click()
  await expect(page.getByRole('link', { name: brand })).toBeVisible()
  for (let n = 1; n <= 6; n++)
    await createProduct(page, {
      name: `Item ${n} ${id}`,
      price: String(n * 100),
      stock: n === 6 ? '0' : '1',
      category: cat,
    })
  const top = `Item 7 ${id}`
  await createProduct(page, { name: top, price: '700', stock: '0', category: cat })
  await editProduct(page, top)
  await page.getByLabel('Brand', { exact: true }).selectOption({ label: brand })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  await editProduct(page, top)
  await page.getByLabel('Options', { exact: true }).fill('Size: XL')
  await page.getByRole('button', { name: 'Apply options' }).click()
  await expect(page.getByRole('rowheader', { name: 'XL' })).toBeVisible()

  const list = `/c/${slug(cat)}`
  const cards = page.locator('.rlc-card')
  const count = page.getByTestId('list-count')
  await page.goto(`${list}?per=6`)
  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Home' }),
  ).toBeVisible()
  await expect(cards).toHaveCount(6)
  const pages = page.getByRole('navigation', { name: 'Pages' })
  await expect(pages.getByRole('link')).toHaveText(['1', '2'])
  await a11y()
  await page.goto((await pages.getByRole('link', { name: '2' }).getAttribute('href'))!)
  await expect(cards).toHaveCount(1)

  await page.goto(list)
  await page.getByLabel('Sort by').selectOption('price_desc')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page).toHaveURL(/sort=price_desc/)
  await expect(cards.first()).toContainText(top)
  const filters = async (fill: () => Promise<void>, n: number) => {
    await page.goto(list)
    await page.locator('details > summary').filter({ hasText: 'Filters' }).click()
    await fill()
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(count).toHaveText(`${n} products`)
  }
  await filters(async () => {
    await page.getByLabel('From', { exact: true }).fill('200')
    await page.getByLabel('To', { exact: true }).fill('400')
  }, 3)
  await expect(page.getByLabel('From', { exact: true })).toHaveValue('200')
  await filters(async () => {
    await page.getByLabel('Brand', { exact: true }).selectOption({ label: brand })
  }, 1)
  await expect(page.getByLabel('Brand', { exact: true }).locator('option:checked')).toHaveText(
    brand,
  )
  await filters(() => page.getByRole('checkbox', { name: 'XL' }).check(), 1)
  await expect(page.getByRole('checkbox', { name: 'XL' })).toBeChecked()
  await filters(() => page.getByRole('checkbox', { name: 'In stock only' }).check(), 5)
  await a11y()

  const cols = page.getByRole('navigation', { name: 'Products per row' })
  await expect(cols).toBeVisible({ visible: page.viewportSize()!.width >= 768 })
  // Hidden on phones (one or two per row there); the link still carries the setting.
  const three = page.locator('nav[aria-label="Products per row"] a', { hasText: '3' })
  await page.goto((await three.getAttribute('href'))!)
  await expect(page.locator('.rlc-grid')).toHaveAttribute('style', /--cols-desktop:\s*3/)
  await expect(page.locator('input[type=hidden][name=cols]')).toHaveValue('3')
})

test('related products and frequently bought together (A8)', async ({ page, a11y }) => {
  const id = uid()
  const cat = `Rel ${id}`
  const [a, b, c] = [`Teapot ${id}`, `Cups ${id}`, `Tray ${id}`]
  await signedIn(page)
  await createCategory(page, cat)
  await createProduct(page, { name: a, price: '300', stock: '5', category: cat })
  await createProduct(page, { name: b, price: '200', stock: '5', category: cat })
  await createProduct(page, { name: c, price: '150', stock: '5' })
  const pick = async (product: string, field: string, other: string) => {
    await editProduct(page, product)
    await page.getByLabel(field).selectOption({ label: other })
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/products$/)
    await editProduct(page, product)
    await expect(page.getByLabel(field).locator('option:checked')).toHaveText(other)
  }
  await pick(a, 'Frequently bought together (optional)', c)
  await pick(b, 'You may also like (optional)', c)

  await page.goto(`/p/${slug(a)}`)
  await page.waitForLoadState('networkidle')
  const related = page.getByRole('region', { name: 'You may also like' })
  await expect(related.getByRole('link', { name: b }).first()).toBeVisible()
  const together = page.getByRole('region', { name: 'Frequently bought together' })
  await expect(together.getByRole('checkbox')).toHaveCount(2)
  const total = page.getByTestId('together-total')
  await expect(total).toHaveText('৳450')
  await together.getByRole('checkbox', { name: c }).uncheck()
  await expect(total).toHaveText('৳300')
  await together.getByRole('checkbox', { name: c }).check()
  await a11y()
  await together.getByRole('button', { name: 'Add selected to cart' }).click()
  await expect(page.getByTestId('cart-subtotal')).toHaveText('৳450')

  await page.goto(`/p/${slug(b)}`)
  await expect(
    page.getByRole('region', { name: 'You may also like' }).locator('.rlc-card').first(),
  ).toContainText(c)
})

test('reviews: a delivered order reviews its item, the owner approves and replies, the page shows it (A7)', async ({
  page,
  a11y,
}) => {
  const id = uid()
  const name = `Reviewed ${id}`
  const phone = '01755' + String(Date.now()).slice(-6)
  await signedIn(page)
  await createProduct(page, { name, price: '400', stock: '5' })
  await page.goto(`/p/${slug(name)}`)
  await expect(page.getByTestId('rating')).toHaveCount(0)
  expect(JSON.parse(await ld(page)).aggregateRating).toBeUndefined()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Order now' }).click()
  await page.waitForURL(/\/checkout$/)
  await fillCheckout(page, phone)
  const no = await placeOrder(page)
  await page.goto(`/admin/orders?q=${no}`)
  await page.getByRole('link', { name: new RegExp(`#${no}`) }).click()
  for (const step of ['Confirm order', 'Start processing', 'Mark shipped', 'Mark delivered']) {
    await page.getByRole('button', { name: step }).click()
    await expect(page.getByRole('button', { name: step })).toHaveCount(0)
  }

  await page.goto('/review')
  await page.getByLabel('Order number').fill(no)
  await page.getByLabel('Phone number').fill('01999999999')
  await page.getByRole('button', { name: 'Find my order' }).click()
  await alert(page, 'No delivered order found with that number and phone.')
  await page.getByLabel('Phone number').fill(phone)
  await page.getByRole('button', { name: 'Find my order' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
  await page.getByLabel('4★').check()
  await page.getByLabel('Your review (optional)').fill('Fresh and well packed.')
  await page.getByLabel('Your name').fill('Rahima')
  await a11y()
  await page.getByRole('button', { name: 'Send review' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Thanks!' })).toBeVisible()
  await page.getByLabel('Your name').fill('Rahima')
  await page.getByRole('button', { name: 'Send review' }).click()
  await alert(page, 'You already reviewed this item.')

  await page.goto('/admin/reviews?status=pending')
  const card = page.getByRole('listitem').filter({ hasText: name })
  await expect(card).toContainText('Fresh and well packed.')
  await a11y()
  await card.getByRole('button', { name: 'Approve' }).click()
  await page.goto('/admin/reviews?status=approved')
  await card.getByLabel('Your reply (optional)').fill('Thank you, Rahima!')
  await card.getByRole('button', { name: 'Save reply' }).click()
  await expect(card.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
  await page.goto('/admin/reviews')
  await expect(card.getByLabel('Your reply (optional)')).toHaveValue('Thank you, Rahima!')

  await page.goto(`/p/${slug(name)}`)
  await expect(page.getByTestId('rating')).toContainText('4 (1 reviews)')
  const reviews = page.getByRole('region', { name: 'Customer reviews' })
  await expect(reviews).toContainText('Fresh and well packed.')
  await expect(reviews).toContainText('Thank you, Rahima!')
  expect(JSON.parse(await ld(page)).aggregateRating).toEqual({
    '@type': 'AggregateRating',
    ratingValue: 4,
    reviewCount: 1,
  })
  await a11y()
})

test('products CSV: check, import (create + update + image link), export; the export needs sign-in (A15)', async ({
  page,
  playwright,
  a11y,
}) => {
  // 403: the signed-out export; 404: the Drive photo is a fake link in tests.
  test.info().annotations.push({ type: 'allow-status', description: '403,404' })
  const id = uid()
  const sku = `CSV-${id}`
  const s = slug(`Csv ${id}`)
  const cat = `Csv cat ${id}`
  const head =
    'slug,name,variant,price,compare_at,cost,stock,sku,status,category,description,images'
  const drive = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view'
  await signedIn(page)
  await createCategory(page, cat)
  const send = async (rows: string[], button: 'Check the file' | 'Import') => {
    await page.getByLabel('CSV file').setInputFiles({
      name: 'products.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([head, ...rows].join('\n')),
    })
    await page.getByRole('button', { name: button, exact: true }).click()
  }
  await page.goto('/admin/products')
  await page.getByRole('link', { name: 'Import / export' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Import products' })).toBeVisible()
  const result = page.getByRole('status')
  await send(['Bad Slug,X,,abc,,,1,,,,,'], 'Check the file')
  await expect(result).toContainText('Fix the rows below')
  await expect(result).toContainText('slug (a-z, 0-9, -), price')
  // Draft: its fake Drive photo must not reach other tests' shop pages.
  const row = `${s},Csv ${id},,250,,,6,${sku},draft,${cat},From a sheet,${drive}`
  await send([row], 'Check the file')
  await expect(result).toContainText('No problems')
  await expect(result.getByRole('cell', { name: 'create' })).toBeVisible()
  await a11y()
  await send([row], 'Import')
  await expect(result).toContainText('Imported.')
  await editProduct(page, `Csv ${id}`)
  await expect(page.getByLabel('Price (৳)', { exact: true })).toHaveValue('250')
  await expect(page.getByTestId('product-images').getByRole('listitem')).toHaveCount(1)

  await page.goto('/admin/products/import')
  await send([row.replace(',250,', ',275,')], 'Import')
  await expect(result.getByRole('cell', { name: 'update' })).toBeVisible()
  await send([`${s}-2,Csv two ${id},,90,,,1,,draft,,,https://example.com/photo.jpg`], 'Import')
  // A non-Drive image link: the products before it are saved, the owner is told.
  await expect(
    page.getByRole('alert').filter({ hasText: 'doesn’t look like a Google Drive file link' }),
  ).toBeVisible()

  await page.goto('/admin/products/import')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download all products as CSV' }).click()
  const csv = readFileSync((await (await download).path())!, 'utf8')
  expect(csv.split('\r\n')[0]).toBe(head)
  expect(csv).toContain(`${s},Csv ${id},,275,,0,6,${sku},draft,${cat},From a sheet,`)
  const anon = await playwright.request.newContext({ baseURL: page.url() })
  expect((await anon.get('/admin/products/export')).status()).toBe(403)
  await anon.dispose()
})

test('robots.txt and sitemap.xml use the store origin', async ({ page, request }) => {
  const name = `Mapped ${uid()}`
  await signedIn(page)
  await createCategory(page, name)
  await createProduct(page, { name, price: '10', stock: '1' })
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Disallow: /admin')
  // Default favicon when the owner has not uploaded one.
  const icon = await request.get('/icon.svg')
  expect(icon.status()).toBe(200)
  expect(icon.headers()['content-type']).toContain('image/svg+xml')
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

test('product images: upload checks, Drive links, removal, and the shop shows them', async ({
  page,
  a11y,
}) => {
  // The fake Drive file has no thumbnail: its proxy answers 404 and the placeholder shows.
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  const name = `Photo ${uid()}`
  await signedIn(page)
  await createProduct(page, { name, price: '450', stock: '3' })
  await editProduct(page, name)
  await expect(page.getByText('No images yet')).toBeVisible()
  await expect(page.getByTestId('storage-usage')).toContainText('Storage used:')
  await a11y()
  const pick = (file: { name: string; mimeType: string; buffer: Buffer }) =>
    page.getByLabel('Choose a photo').setInputFiles(file)
  await pick({
    name: 'virus.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<svg onload=alert(1)>'),
  })
  await page.getByRole('button', { name: 'Upload image' }).click()
  await alert(page, 'Please choose a JPG, PNG, WebP or GIF photo.')
  await pick({
    name: 'huge.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(8 * 1024 * 1024 + 10, 0xff),
  })
  await page.getByRole('button', { name: 'Upload image' }).click()
  await alert(page, 'That file is too large.')
  await uploadPhoto(page)
  await uploadPhoto(page, '#a8763e')
  await page.getByLabel('…or paste a Google Drive link').fill('https://example.com/not-drive')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await alert(page, 'That doesn’t look like a Google Drive file link.')
  await page
    .getByLabel('…or paste a Google Drive link')
    .fill('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const images = page.getByTestId('product-images').getByRole('listitem')
  await expect(images).toHaveCount(3)
  await images.nth(2).getByRole('button', { name: 'Remove image' }).click()
  await expect(images).toHaveCount(2)

  await page.goto(`/p/${slug(name)}`)
  // Slides only: each photo also shows as a thumbnail.
  const gallery = page.getByRole('list', { name: 'Photos' }).locator('img')
  await expect(gallery).toHaveCount(2)
  await expect(gallery.first()).toHaveJSProperty('complete', true)
  expect(await gallery.first().evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0)
  expect(JSON.parse(await ld(page)).image).toHaveLength(2)
  await a11y()
  await page.goto(`/search?q=${encodeURIComponent(name)}`)
  await expect(page.locator('main li img')).toHaveCount(1)
  for (const url of [
    '/api/media/nope/320',
    '/api/media/00000000-0000-4000-8000-000000000000/320',
  ]) {
    expect((await page.request.get(url)).status()).toBe(404)
  }
})

test('order tracking is rate limited per connection', async ({ page }) => {
  await page.goto('/track')
  await page.getByLabel('Order number').fill('999999')
  await page.getByLabel('Phone number').fill('01712345678')
  const submit = page.getByRole('button', { name: 'Track order' })
  await submit.click()
  await expect(page.getByRole('alert').filter({ hasText: 'No order found' })).toBeVisible()
  const limited = page.getByRole('alert').filter({ hasText: 'Too many tries' })
  // 20 tries per 10 minutes: keep submitting (each waits for its answer) until refused.
  for (let i = 0; i < 25 && !(await limited.isVisible()); i++) {
    // The form clears after each answer (React form actions reset it): wait, then refill.
    await expect(page.getByLabel('Order number')).toHaveValue('')
    await page.getByLabel('Order number').fill('999999')
    await page.getByLabel('Phone number').fill('01712345678')
    const answered = page.waitForResponse((r) => r.request().method() === 'POST')
    await submit.click()
    await answered
  }
  await expect(page.getByRole('alert').filter({ hasText: 'Too many tries' })).toBeVisible()
  // Review lookups share the same per-connection limit (they also take number + phone).
  await page.goto('/review')
  await page.getByLabel('Order number').fill('999999')
  await page.getByLabel('Phone number').fill('01712345678')
  await page.getByRole('button', { name: 'Find my order' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Too many tries' })).toBeVisible()
})

test('TLS ask endpoint approves only store domains', async ({ request }) => {
  test.info().annotations.push({ type: 'allow-status', description: '404' })
  expect((await request.get('/api/domains/check?domain=127.0.0.1')).status()).toBe(200)
  expect((await request.get('/api/domains/check?domain=evil.example')).status()).toBe(404)
  expect((await request.get('/api/domains/check')).status()).toBe(404)
})

test('mini-cart: a count and total pill appears with items and reopens the cart', async ({
  page,
  a11y,
}) => {
  const id = uid()
  await signedIn(page)
  await createProduct(page, { name: `Mini ${id}`, price: '120', stock: '5' })
  await page.goto(`/search?q=${encodeURIComponent(`Mini ${id}`)}`)
  const pill = page.getByRole('complementary', { name: 'Your cart' })
  await expect(pill).toHaveCount(0)
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(drawer(page)).toBeVisible()
  await drawer(page).getByRole('button', { name: 'Continue shopping' }).click()
  await expect(pill.getByRole('button')).toContainText('1 in cart · ৳120 · View cart')
  await a11y()
  await pill.getByRole('button').click()
  await expect(drawer(page)).toBeVisible()
  await drawer(page).getByRole('button', { name: 'Remove' }).click()
  await expect(pill).toHaveCount(0)
})

test('incomplete checkout: the draft comes back for the shopper and waits for the owner (C1)', async ({
  page,
  a11y,
}) => {
  const id = uid()
  const name = `Draft ${id}`
  const phone = `019${Date.now().toString().slice(-8)}`
  const other = `018${Date.now().toString().slice(-8)}`
  const saved = () =>
    page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/checkout',
    )
  await signedIn(page)
  await createProduct(page, { name, price: '150', stock: '5' })
  await page.goto(`/p/${slug(name)}`)
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.goto('/checkout')
  await expect(page.getByText('We keep what you type here')).toBeVisible()
  await page.getByLabel('Full name').fill('Karim Draft')
  let save = saved()
  await page.getByLabel('Phone number').fill(phone)
  await save
  // Coming back: the browser's copy fills the form again.
  await page.goto('/checkout')
  await expect(
    page.getByRole('status').filter({ hasText: 'What you typed is still here.' }),
  ).toBeVisible()
  await expect(page.getByLabel('Full name')).toHaveValue('Karim Draft')
  await expect(page.getByLabel('Phone number')).toHaveValue(phone)
  await a11y()

  await page.goto('/admin/orders')
  await page.goto(
    (await page.getByRole('link', { name: 'Incomplete', exact: true }).getAttribute('href'))!,
  )
  const card = page.locator('li').filter({ hasText: phone })
  await expect(card).toContainText('Karim Draft')
  await expect(card).toContainText('1 items')
  await expect(card.getByRole('link', { name: 'Call' })).toHaveAttribute('href', `tel:${phone}`)
  await expect(card.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
    'href',
    `https://wa.me/88${phone}`,
  )
  await a11y()
  // No address yet: converting says what is missing and keeps the draft.
  await card.getByRole('button', { name: 'Make it an order' }).click()
  await alert(page, 'Please check the highlighted fields.')

  // The shopper adds the address (the draft follows), then starts again with another phone.
  await page.goto('/checkout')
  await page.getByLabel('District').fill('Dhaka')
  await page.getByLabel('Area / Thana').fill('Mirpur')
  save = saved()
  await page.getByLabel('Full address').fill('House 9, Road 2')
  await save
  save = saved()
  await page.getByLabel('Phone number').fill(other)
  await save

  await page.goto('/admin/orders/incomplete')
  await page
    .locator('li')
    .filter({ hasText: other })
    .getByRole('button', { name: 'Discard' })
    .click()
  await expect(page.locator('li').filter({ hasText: other })).toHaveCount(0)
  await card.getByRole('button', { name: 'Make it an order' }).click()
  await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}$/)
  await expect(page.getByText('House 9, Road 2')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByText('Cancelled').first()).toBeVisible()
  await page.goto('/admin/orders/incomplete')
  await expect(page.getByText(phone)).toHaveCount(0)
})
