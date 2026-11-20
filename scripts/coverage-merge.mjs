// Merges unit/integration (Vitest), e2e browser and e2e Next-server V8 coverage into one
// report and fails unless every metric is 100% over src/**.
import { CoverageReport } from 'monocart-coverage-reports'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const srcRoot = `${resolve('src')}/`

const inputDir = ['.coverage/unit/raw', '.coverage/browser/raw'].filter((d) => existsSync(d))

const report = new CoverageReport({
  name: 'Root Logic Commerce — merged coverage',
  inputDir,
  outputDir: 'coverage',
  reports: ['console-summary', 'v8', 'lcovonly'],
  // Only our compiled route chunks (browser: static/chunks/app, server: .next-cov/server/app) and
  // unit-test sources; Next's own framework chunks carry source maps with colliding src/ paths.
  entryFilter: (e) =>
    !e.url.includes('node_modules') &&
    (e.url.includes('/chunks/app/') ||
      e.url.includes('.next-cov/server/app/') ||
      e.url.includes(srcRoot)),
  sourceFilter: (p) => p.startsWith('src/') && !p.endsWith('.css') && existsSync(p),
  all: {
    dir: ['./src'],
    filter: {
      '**/*.d.ts': false,
      '**/*.test.*': false,
      '**/*.css': false,
      '**/migrations/**': false,
      '**/*': true,
    },
  },
})

if (existsSync('.coverage/server-v8')) await report.addFromDir('.coverage/server-v8')
const { summary } = await report.generate()

const failing = ['lines', 'branches', 'functions', 'statements'].filter(
  (k) => summary[k].pct !== 100 && (summary[k].total > 0 || k === 'lines'),
)
if (failing.length) {
  console.error(`Coverage below 100%: ${failing.map((k) => `${k} ${summary[k].pct}%`).join(', ')}`)
  process.exit(1)
}
console.log('Merged coverage: 100% lines, branches, functions, statements')
