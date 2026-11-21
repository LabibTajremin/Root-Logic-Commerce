import { test as base, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { addBrowserCoverage } from './coverage'

type Fixtures = { a11y: (exclude?: string) => Promise<void> }

// Every test fails on console errors/warnings, page errors, failed requests or HTTP >= 400,
// and collects browser V8 coverage for the merged report.
export const test = base.extend<Fixtures>({
  page: async ({ page }, provide, testInfo) => {
    const problems: string[] = []
    // Read lazily: tests add `allow-status` annotations inside their body.
    const allowed = () =>
      (testInfo.annotations.find((a) => a.type === 'allow-status')?.description ?? '')
        .split(',')
        .filter(Boolean)
    page.on('console', (m) => {
      // The browser logs every non-2xx fetch; statuses a test expects are not problems.
      const expected = allowed().some((s) => m.text().includes(`status of ${s}`))
      if ((m.type() === 'error' || m.type() === 'warning') && !expected)
        problems.push(`console.${m.type()}: ${m.text()}`)
    })
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
    page.on('requestfailed', (r) => {
      if (r.failure()?.errorText !== 'net::ERR_ABORTED') problems.push(`requestfailed: ${r.url()}`)
    })
    page.on('response', (r) => {
      if (r.status() >= 400 && !allowed().includes(String(r.status())))
        problems.push(`HTTP ${r.status()}: ${r.url()}`)
    })
    // Each test is its own "client IP" so sign-in rate limits never leak between tests.
    const n = (testInfo.workerIndex * 1000 + testInfo.testId.length * 37 + Date.now()) % 250
    await page.setExtraHTTPHeaders({
      'x-forwarded-for': `10.${testInfo.workerIndex % 250}.${testInfo.repeatEachIndex}.${n + 1}`,
    })
    // Never call third parties from tests: gtag.js and video embeds get empty answers.
    await page.route('https://www.googletagmanager.com/**', (r) =>
      r.fulfill({ contentType: 'text/javascript', body: '' }),
    )
    await page.route(
      /^https:\/\/(www\.youtube-nocookie\.com|i\.ytimg\.com|www\.facebook\.com|www\.instagram\.com)\//,
      (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>embed</title>' }),
    )
    await page.coverage.startJSCoverage({ resetOnNavigation: false })
    // A full navigation discards the old document's script coverage, so flush first.
    // Tests follow plain (non-Next) links with goto(href) for the same reason.
    const flush = async () => {
      await addBrowserCoverage(await page.coverage.stopJSCoverage())
      // Never call Google from tests: gtag.js is answered with an empty script.
      await page.route('https://www.googletagmanager.com/**', (r) =>
        r.fulfill({ contentType: 'text/javascript', body: '' }),
      )
      await page.coverage.startJSCoverage({ resetOnNavigation: false })
    }
    const goto = page.goto.bind(page)
    const reload = page.reload.bind(page)
    page.goto = async (url, options) => (await flush(), goto(url, options))
    page.reload = async (options) => (await flush(), reload(options))
    await provide(page)
    await addBrowserCoverage(await page.coverage.stopJSCoverage())
    expect(problems, 'console/network problems').toEqual([])
  },
  a11y: async ({ page }, provide) => {
    await provide(async (exclude) => {
      // Next streams <title> in after the body: don't audit a page that's still arriving.
      await expect(page).toHaveTitle(/\S/)
      const axe = new AxeBuilder({ page })
      const { violations } = await (exclude ? axe.exclude(exclude) : axe).analyze()
      expect(
        violations.map(
          (v) => `${v.id}: ${v.help} @ ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([])
    })
  },
})

export { expect }
