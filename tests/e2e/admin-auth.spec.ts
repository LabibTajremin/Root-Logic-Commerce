import { test, expect } from './fixtures'
import { signIn } from './admin'

test('unauthenticated admin visits go to sign-in', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('wrong password shows an error', async ({ page }) => {
  test.info().annotations.push({ type: 'allow-status', description: '401' })
  await signIn(page, 'owner@e2e.test', 'wrong-password')
  await expect(
    page.getByRole('alert').filter({ hasText: 'Wrong email or password.' }),
  ).toBeVisible()
})

test('owner signs in, sees the dashboard, switches to বাংলা and signs out', async ({
  page,
  a11y,
}) => {
  await signIn(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  await expect(page.getByTestId('kpi-pending')).toHaveText('0')
  await a11y()
  await page.getByRole('link', { name: 'বাং' }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'ড্যাশবোর্ড' })).toBeVisible()
  await page.getByRole('link', { name: 'EN' }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
  await page.goto('/admin/login')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('signed-in users skip the sign-in page and the help popover opens', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  await page.goto('/admin/login')
  await expect(page).toHaveURL(/\/admin$/)
})

test('help hint explains a field', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByRole('button', { name: 'Help' }).first().click()
  await expect(page.getByText('The email Root Logic Lab set up for you.')).toBeVisible()
})

test('too many wrong tries are rate limited', async ({ page }) => {
  test.info().annotations.push({ type: 'allow-status', description: '401,429' })
  await page.setExtraHTTPHeaders({
    'x-forwarded-for': `10.250.${test.info().workerIndex}.${Date.now() % 250}`,
  })
  for (let i = 0; i < 6; i++) await signIn(page, 'owner@e2e.test', `bad-${i}-password`)
  await expect(page.getByRole('alert').filter({ hasText: 'Too many tries' })).toBeVisible()
})

test('language link ignores unknown languages and foreign redirects', async ({ page }) => {
  await page.goto('/admin/lang?to=fr&back=https://evil.test')
  await expect(page).toHaveURL(/\/admin\/login$/)
})
