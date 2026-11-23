// Starts the coverage build (`pnpm build:cov` first) on E2E_PORT with server V8 coverage,
// runs Playwright against it, then stops the server so Node flushes NODE_V8_COVERAGE.
import { spawn, spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { setTimeout as wait } from 'node:timers/promises'
import { e2eEnv } from './e2e-env.mjs'

rmSync('.e2e', { recursive: true, force: true })
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
const e2e = spawnSync(`pnpm e2e ${process.argv.slice(2).join(" ")}`, {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, E2E_PORT: port },
})
await stop()
process.exit(e2e.status ?? 1)
