import { CoverageReport } from 'monocart-coverage-reports'
import type { V8CoverageEntry } from 'monocart-coverage-reports'

export const browserCoverageOptions = {
  name: 'e2e-browser',
  outputDir: '.coverage/browser',
  reports: ['raw'] as const,
}

const report = new CoverageReport({ ...browserCoverageOptions, reports: ['raw'] })

export const addBrowserCoverage = async (entries: V8CoverageEntry[]) => {
  // Same URL across flushes merges per script (V8-aware). Within one flush a URL can
  // repeat (a script loaded twice); only those repeats get a suffix so none is dropped.
  const seen = new Map<string, number>()
  const ours = entries
    .filter((e) => e.url.includes('/_next/static/'))
    .map((e) => {
      const n = seen.get(e.url) ?? 0
      seen.set(e.url, n + 1)
      return n ? { ...e, url: `${e.url}#${n}` } : e
    })
  if (ours.length) await report.add(ours)
}
