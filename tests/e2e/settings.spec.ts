import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { signedIn } from './admin'
import { createProduct, fillCheckout, uid } from './shop'

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
const otpToggles = async (page: Page, sms: boolean, email: boolean) => {
  await page.goto('/admin/messages')
  await page.getByLabel('SMS code').setChecked(sms)
  await page.getByLabel('Email code').setChecked(email)
  await page.getByRole('button', { name: 'Save' }).click()
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
    await page.getByRole('link', { name: `Sale ${id}` }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: `Sale ${id}` })).toBeVisible()
    await a11y()
    await page.goto('/missing-page')
    await a11y()
  }
})
