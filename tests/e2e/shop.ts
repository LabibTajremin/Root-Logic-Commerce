import { expect, type Page } from '@playwright/test'
import sharp from 'sharp'
import { test } from './fixtures'

export const uid = () => `${test.info().project.name}-${Date.now().toString(36)}`
export const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

type NewProduct = {
  name: string
  price: string
  stock: string
  compareAt?: string
  sku?: string
  category?: string
  seoTitle?: string
  description?: string
  badge?: { text: string; tone: string }
}

/** Creates a product through the admin editor (owner must be signed in). */
export const createProduct = async (page: Page, p: NewProduct) => {
  await page.goto('/admin/products/new')
  await page.getByLabel('Product name').fill(p.name)
  await page.getByLabel('Price (৳)', { exact: true }).fill(p.price)
  await page.getByLabel('Stock quantity').fill(p.stock)
  if (p.compareAt) await page.getByLabel('Compare-at price (৳)').fill(p.compareAt)
  if (p.sku) await page.getByLabel('SKU (optional)').fill(p.sku)
  if (p.category)
    await page.getByLabel('Category', { exact: true }).selectOption({ label: p.category })
  if (p.seoTitle) await page.getByLabel('SEO title').fill(p.seoTitle)
  if (p.description) await page.getByLabel('Description', { exact: true }).fill(p.description)
  if (p.badge) {
    await page.getByLabel('Badge text (optional)').fill(p.badge.text)
    await page.getByLabel('Badge colour').selectOption(p.badge.tone)
  }
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
}

export const createCategory = async (page: Page, name: string) => {
  await page.goto('/admin/categories')
  await page.getByLabel('Category name').fill(name)
  await page.getByRole('button', { name: 'Add category' }).click()
  await expect(page.getByRole('link', { name })).toBeVisible()
}

export const fillCheckout = async (page: Page, phone = '01712345678') => {
  await page.getByLabel('Full name').fill('Rahim Uddin')
  await page.getByLabel('Phone number').fill(phone)
  await page.getByLabel('District').fill('Dhaka')
  await page.getByLabel('Area / Thana').fill('Mirpur')
  await page.getByLabel('Full address').fill('House 12, Road 3')
}

/** A real JPEG, generated so no binary fixture lives in the repo. */
export const photo = async (color = '#3c6430') => ({
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
  buffer: await sharp({ create: { width: 1200, height: 1200, channels: 3, background: color } })
    .jpeg()
    .toBuffer(),
})

/** Opens the product's editor from the list (owner signed in). */
export const editProduct = async (page: Page, name: string) => {
  await page.goto('/admin/products')
  await page.getByRole('link', { name: new RegExp(name) }).click()
  await expect(page.getByRole('heading', { name: 'Edit product' })).toBeVisible()
}

export const uploadPhoto = async (page: Page, color?: string) => {
  const count = await page.getByTestId('product-images').getByRole('listitem').count()
  await page.getByLabel('Choose a photo').setInputFiles(await photo(color))
  await page.getByRole('button', { name: 'Upload image' }).click()
  await expect(page.getByTestId('product-images').getByRole('listitem')).toHaveCount(count + 1)
}
