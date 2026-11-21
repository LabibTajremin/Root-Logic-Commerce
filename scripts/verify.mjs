// Single quality gate used locally and in CI: lint, typecheck, unit+integration, build,
// Lighthouse (≥95 mobile), coverage build + e2e (with server V8 coverage), merged 100% coverage check.
import { spawn, spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { e2eEnv } from './e2e-env.mjs'
import { setTimeout as wait } from 'node:timers/promises'

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

const port = process.env.E2E_PORT ?? '3100'
const server = spawn('pnpm', ['next', 'start', '-p', port, '-H', '127.0.0.1'], {
  stdio: 'inherit',
  env: { ...process.env, ...e2eEnv, COVERAGE: '1', NODE_V8_COVERAGE: '.coverage/server-v8' },
  detached: true,
})
const stop = async () => {
  // SIGINT lets Next exit normally so Node flushes NODE_V8_COVERAGE.
  try {
    process.kill(-server.pid, 'SIGINT')
  } catch {}
  await new Promise((r) => server.once('exit', r))
}
for (let i = 0; i < 120; i++) {
  try {
    if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break
  } catch {}
  await wait(500)
}
const e2e = spawnSync('pnpm e2e', {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, E2E_PORT: port },
})
await stop()
if (e2e.status !== 0) process.exit(e2e.status ?? 1)
run('pnpm coverage:merge')
console.log('\n✔ verify passed')
