import type { Page } from '@playwright/test'
import { e2eEnv } from '../../scripts/e2e-env.mjs'

export const owner = {
  email: e2eEnv.BOOTSTRAP_OWNER_EMAIL,
  password: e2eEnv.BOOTSTRAP_OWNER_PASSWORD,
}

export const signIn = async (page: Page, email = owner.email, password = owner.password) => {
  await page.goto('/admin/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}
