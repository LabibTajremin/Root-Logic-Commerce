# Root Logic Commerce

Configurable online shops for small businesses in Bangladesh — by Root Logic Lab.
One codebase serves many stores (one per domain). Each owner manages their shop in a mobile-first
admin panel in English or বাংলা. Customers pay cash on delivery.

- **Storefront:** home, categories, product pages, search, cart, guest checkout with optional
  SMS/email OTP, order tracking, promo banners/videos, SEO (sitemap, JSON-LD), GA4.
- **Admin:** orders (confirm → stock deducted, cancel → restocked, printable invoice), products with
  photos (upload or Google Drive link), drag-and-drop categories, stock, design editor with live
  preview (5 themes, colours, fonts, card/hover/motion styles), messages (email, SMS, WhatsApp),
  insights dashboard, promotions, users and roles, premium plan locks.
- **Quality:** TDD, 100% merged coverage (unit + integration + browser + server), zero console
  errors and zero axe violations in e2e, Lighthouse ≥ 95 on mobile. `pnpm verify` is the gate.

Spec: [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) · progress and decisions: [`PROGRESS.md`](PROGRESS.md) ·
design: [`design/README.md`](design/README.md).

## Set up in 10 steps (local)

1. Install **Node 22** and **pnpm** (`corepack enable`).
2. `git clone <this repo> && cd Root-Logic-Commerce`
3. `pnpm install`
4. `cp .env.example .env.local` — the comments explain every value.
5. For a quick start without Postgres, set `DATABASE_URL=pglite:.data/db` (Postgres in-process,
   migrated automatically). For real Postgres, use `postgres://…` and run `pnpm db:migrate`.
6. Set `AUTH_SECRET` and `SETTINGS_KEY` to two random strings of 32+ characters
   (`openssl rand -hex 32`).
7. Set `BOOTSTRAP_OWNER_EMAIL` / `BOOTSTRAP_OWNER_PASSWORD` (your shop owner login) and, optionally,
   `BOOTSTRAP_SUPER_EMAIL` / `BOOTSTRAP_SUPER_PASSWORD` (Root Logic Lab's plan manager).
8. Edit `store.config.ts`: store name, slug, default theme and language.
9. `pnpm dev`, then open http://localhost:3000 (shop) and http://localhost:3000/admin (admin).
10. Before every push, run `pnpm verify`: lint, types, tests, build, Lighthouse, e2e and the 100%
    coverage gate. CI runs exactly the same, plus separate lint, unit, integration and e2e jobs
    so a failure shows which layer broke.

## Deploy

**VPS (Namecheap Spark or any 1 vCPU / 2 GB Ubuntu 24.04)**: everything is in [`deploy/`](deploy/):

```bash
REPO=https://github.com/<you>/Root-Logic-Commerce.git ACME_EMAIL=you@example.com bash deploy/setup.sh
```

The script installs Postgres (tuned small), Node 22, PM2 and Caddy. It then writes `/etc/rlc/env`,
builds, migrates and starts the app. Caddy issues TLS automatically for every store domain listed in
`BOOTSTRAP_HOSTS`. Media is stored on local disk (`/var/lib/rlc/media`). Sending messages, purging
old analytics rows and nightly `pg_dump` backups (the last 7 are kept) run by themselves. Re-run the
script to update.
Measured footprint: 132 MB idle, 192 MB under load, 104 req/s on one CPU (see `PROGRESS.md`).

**Vercel**: import the repo, then set:

- `DATABASE_URL` (Neon or Supabase Postgres)
- `AUTH_SECRET`, `SETTINGS_KEY`, `CRON_SECRET`
- `HOSTING_PROFILE=vercel`
- `STORAGE_DRIVER=s3` with the `S3_*` values (Cloudflare R2 or AWS S3)

`vercel.json` runs the migrations during the build. Vercel Cron calls `/api/cron/outbox` every
10 minutes; the Hobby plan only allows daily crons.

## Useful commands

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm verify` | The full quality gate (same as CI) |
| `pnpm test` · `pnpm vitest related <file>` | Fast unit/integration loop |
| `pnpm test:unit` · `pnpm test:integration` | One layer only (`src/**` or `tests/integration/**`) |
| `pnpm test:e2e` | Coverage build, start the server, run Playwright, stop the server |
| `pnpm e2e` | Playwright against an already running server (see `scripts/e2e-serve.sh`) |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm themes:gen` | Re-register theme folders after adding one under `src/themes/` |
| `pnpm lighthouse` | Lighthouse gate on the production build |

## Run the build unattended (Claude Code)

Requirements: `claude` (logged in), `git` with push access, `gh` logged in, Node 22 + pnpm.

```bash
git switch <work-branch> && git pull   # the PR branch; main is never pushed to directly
tmux new -s build './scripts/autopilot.sh'   # detach: Ctrl-b d · logs: .autopilot/autopilot.log
```

First run interactively once (`claude`, then "Run the §11 preflight") so it asks for any missing
git or GitHub access in one go. It stops by itself when `PROGRESS.md` starts with
`ALL_PHASES_DONE`, or with `BLOCKED: …` if it needs you. It runs with
`--dangerously-skip-permissions`, so use a dedicated machine or container.
