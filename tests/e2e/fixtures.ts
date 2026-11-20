import { test as base, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { addBrowserCoverage } from './coverage'

type Fixtures = { a11y: () => Promise<void> }

// Every test fails on console errors/warnings, page errors, failed requests or HTTP >= 400,
// and collects browser V8 coverage for the merged report.
export const test = base.extend<Fixtures>({
  page: async ({ page }, provide, testInfo) => {
    const problems: string[] = []
    const allowed = (testInfo.annotations.find((a) => a.type === 'allow-status')?.description ?? '')
      .split(',')
      .filter(Boolean)
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning')
        problems.push(`console.${m.type()}: ${m.text()}`)
    })
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
    page.on('requestfailed', (r) => {
      if (r.failure()?.errorText !== 'net::ERR_ABORTED') problems.push(`requestfailed: ${r.url()}`)
    })
    page.on('response', (r) => {
      if (r.status() >= 400 && !allowed.includes(String(r.status())))
        problems.push(`HTTP ${r.status()}: ${r.url()}`)
    })
    await page.coverage.startJSCoverage({ resetOnNavigation: false })
    await provide(page)
    await addBrowserCoverage(await page.coverage.stopJSCoverage())
    expect(problems, 'console/network problems').toEqual([])
  },
  a11y: async ({ page }, provide) => {
    await provide(async () => {
      const { violations } = await new AxeBuilder({ page }).analyze()
      expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    })
  },
})

export { expect }
