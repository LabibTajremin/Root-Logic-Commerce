import { CoverageReport } from 'monocart-coverage-reports'
import type { V8CoverageEntry } from 'monocart-coverage-reports'

export const browserCoverageOptions = {
  name: 'e2e-browser',
  outputDir: '.coverage/browser',
  reports: ['raw'] as const,
}

const report = new CoverageReport({ ...browserCoverageOptions, reports: ['raw'] })

export const addBrowserCoverage = async (entries: V8CoverageEntry[]) => {
  // App chunks only; framework scripts from other origins are irrelevant.
  await report.add(entries.filter((e) => e.url.includes('/_next/static/')))
}
