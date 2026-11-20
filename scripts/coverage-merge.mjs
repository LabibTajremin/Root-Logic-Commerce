// Coverage gate: every source file under src/ must be 100% covered (lines, branches,
// functions, statements) by the test layer that runs it:
//   • Vitest (unit + integration on PGlite) — raw V8 from vitest-monocart-coverage
//   • e2e browser V8 — for 'use client' components
//   • e2e Next server V8 (NODE_V8_COVERAGE) — for server components, actions, routes
// Each file is measured in one compilation; merging line ranges across differently
// compiled bundles (Vitest, server chunks, browser chunks) misaligns and is not reliable.
import { CoverageReport } from 'monocart-coverage-reports'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const METRICS = ['lines', 'branches', 'functions', 'statements']
// Explicit exclusions (spec §8): generated, migrations, pure types, data and config.
const EXCLUDED = [
  /\.test\.tsx?$/,
  /\.d\.ts$/,
  /\.css$/,
  /\.json$/,
  /\/migrations\//,
  /\/ports\.ts$/,
  /registry\.gen\.ts$/,
]

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
const sources = walk('src').filter((p) => !EXCLUDED.some((r) => r.test(p)))
const isClient = (p) => /^\s*['"]use client['"]/.test(readFileSync(p, 'utf8'))
const ours = (p) => p.startsWith('src/') && sources.includes(p)
// Coverage builds tag our files `rlc/src/…`; tools prefix it with the bundle folder.
const tagged = (p) => (p.includes('rlc/src/') ? p.slice(p.indexOf('rlc/src/') + 4) : null)
// One path per source, so copies of a module in different route bundles are merged.
const unify = (p) => (tagged(p) ? `rlc/${tagged(p)}` : p)

const layer = async (name, add, sourceFilter, extra = {}) => {
  const report = new CoverageReport({
    name: `coverage — ${name}`,
    outputDir: `coverage/${name}`,
    reports: ['v8', 'lcovonly'],
    sourceFilter,
    ...extra,
  })
  await add(report)
  return (await report.generate()) ?? { files: [] }
}

const unit = await layer(
  'unit',
  () => {},
  (p) => ours(p),
  { inputDir: ['.coverage/unit/raw'].filter((d) => existsSync(d)) },
)
const browser = await layer(
  'browser',
  () => {},
  (p) => tagged(p) !== null && ours(tagged(p)) && isClient(tagged(p)),
  {
    inputDir: ['.coverage/browser/raw'].filter((d) => existsSync(d)),
    sourcePath: unify,
  },
)
const server = await layer(
  'server',
  async (r) => existsSync('.coverage/server-v8') && (await r.addFromDir('.coverage/server-v8')),
  (p) => tagged(p) !== null && ours(tagged(p)) && !isClient(tagged(p)),
  { entryFilter: (e) => e.url.includes('.next-cov/server/'), sourcePath: unify },
)

const full = (f) => METRICS.every((m) => f.summary[m].total === 0 || f.summary[m].pct === 100)
const byFile = new Map()
for (const [name, res] of [
  ['unit', unit],
  ['browser', browser],
  ['server', server],
]) {
  for (const f of res.files ?? []) {
    const path = tagged(f.sourcePath) ?? f.sourcePath
    const prev = byFile.get(path)
    if (!prev || (!full(prev.f) && full(f))) byFile.set(path, { name, f })
  }
}

const problems = []
for (const p of sources) {
  const hit = byFile.get(p)
  if (!hit) problems.push(`${p}: not executed by any test`)
  else if (!full(hit.f)) {
    const gaps = METRICS.filter((m) => hit.f.summary[m].pct !== 100 && hit.f.summary[m].total > 0)
      .map((m) => `${m} ${hit.f.summary[m].pct}%`)
      .join(', ')
    problems.push(`${p} (${hit.name}): ${gaps}`)
  }
}
console.log(`Coverage: ${sources.length - problems.length}/${sources.length} source files at 100%`)
if (problems.length) {
  console.error(`Below 100%:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log('Coverage: 100% lines, branches, functions, statements for every source file')
