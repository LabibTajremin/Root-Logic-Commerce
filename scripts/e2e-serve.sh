#!/usr/bin/env bash
# Dev loop helper: rebuild the coverage bundle and (re)start the e2e server on :3100.
set -e
pkill -f "next start -p 3100" || true
[ "$1" = "--no-build" ] || pnpm build:cov >/dev/null
rm -rf .e2e
env $(node -e "import('./scripts/e2e-env.mjs').then(m=>console.log(Object.entries(m.e2eEnv).map(([k,v])=>k+'='+v).join(' ')))") COVERAGE=1 \
  nohup pnpm next start -p 3100 -H 127.0.0.1 > .e2e-server.log 2>&1 &
for i in $(seq 60); do curl -s -o /dev/null http://127.0.0.1:3100/ && exit 0; sleep 0.5; done
