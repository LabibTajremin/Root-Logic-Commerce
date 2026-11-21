// Single quality gate used locally and in CI: lint, typecheck, unit+integration, build,
// Lighthouse (≥95 mobile), coverage build + e2e (with server V8 coverage), merged 100% coverage check.
import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const run = (cmd, env = {}) => {
  console.log(`\n▶ ${cmd}`)
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit', env: { ...process.env, ...env } })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

rmSync('.coverage', { recursive: true, force: true })
rmSync('coverage', { recursive: true, force: true })
rmSync('.e2e', { recursive: true, force: true })
run('pnpm lint')
run('pnpm typecheck')
run('pnpm test:cov')
run('pnpm build')
run('pnpm lighthouse')
run('pnpm build:cov')
run('node scripts/e2e-run.mjs')
run('pnpm coverage:merge')
console.log('\n✔ verify passed')
