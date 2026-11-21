// Lighthouse gate (spec §8): the production build must score ≥ 95 in every category on
// mobile for the indexable storefront pages. Checkout/track/order pages are noindex on purpose.
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { setTimeout as wait } from 'node:timers/promises'
import { chromium } from '@playwright/test'
import { e2eEnv } from './e2e-env.mjs'

const MIN = 95
const PAGES = ['/', '/search', '/search?q=tea']
const port = '3320'
const dir = '.lh'
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir)

const server = spawn('pnpm', ['next', 'start', '-p', port, '-H', '127.0.0.1'], {
  stdio: 'ignore',
  env: { ...process.env, ...e2eEnv, DATABASE_URL: `pglite:${dir}/db`, MEDIA_DIR: `${dir}/media` },
  detached: true,
})
for (let i = 0; i < 120; i++) {
  try {
    if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break
  } catch {}
  await wait(500)
}

const failures = []
for (const [i, path] of PAGES.entries()) {
  const out = `${dir}/report-${i}.json`
  spawnSync(
    'pnpm',
    [
      'dlx',
      'lighthouse@12.8.2',
      `http://127.0.0.1:${port}${path}`,
      '--quiet',
      '--output=json',
      `--output-path=${out}`,
      '--only-categories=performance,accessibility,best-practices,seo',
      '--chrome-flags=--headless=new --no-sandbox',
    ],
    { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromium.executablePath() } },
  )
  const r = JSON.parse(readFileSync(out, 'utf8'))
  const scores = Object.fromEntries(
    Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]),
  )
  console.log(`lighthouse ${path}`, scores)
  for (const [k, s] of Object.entries(scores))
    if (s < MIN) failures.push(`${path} ${k} ${s} < ${MIN}`)
}
try {
  process.kill(-server.pid, 'SIGINT')
} catch {}
if (failures.length) {
  console.error(`Lighthouse below ${MIN}:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('Lighthouse: every page ≥ 95 in every category')
