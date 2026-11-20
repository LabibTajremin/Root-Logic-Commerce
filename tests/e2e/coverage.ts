import { CoverageReport } from 'monocart-coverage-reports'
import type { V8CoverageEntry } from 'monocart-coverage-reports'

export const browserCoverageOptions = {
  name: 'e2e-browser',
  outputDir: '.coverage/browser',
  reports: ['raw'] as const,
}

const report = new CoverageReport({ ...browserCoverageOptions, reports: ['raw'] })

let batch = 0

export const addBrowserCoverage = async (entries: V8CoverageEntry[]) => {
  // Same script URL appears per test and again after reloads; entries sharing a URL
  // are not summed, so make each unique — the merge then sums them per source file.
  const tag = `${process.pid}-${batch++}`
  const seen = new Map<string, number>()
  const unique = entries
    .filter((e) => e.url.includes('/_next/static/'))
    .map((e) => {
      const n = seen.get(e.url) ?? 0
      seen.set(e.url, n + 1)
      return { ...e, url: `${e.url}#${tag}-${n}` }
    })
  if (unique.length) await report.add(unique)
}
