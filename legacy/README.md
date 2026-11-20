# legacy/ — reference only (from LabibTajremin/E_Commerce)

Curated pieces of the earlier Python/FastAPI + two-Next.js-app build. **Not part of the build.** Never import from here, never lint/test/cover it. Read only the files listed for the phase you are in. Port the *rules and test cases*, not the code shape. Delete this folder at the end of Phase 7 (§9 of `docs/BUILD_SPEC.md`).

## Port map

| Legacy file(s) | Port into | Phase | Change while porting |
|---|---|---|---|
| `backend/src/domain/value_objects/slug.py`, `application/use_cases/_slug.py` | `modules/catalog/domain/slug.ts` | 3 | Old version drops non-ASCII → Bangla names become `item`. Transliterate Bangla (or fallback `p-<shortid>`), keep unique-per-store suffixing. |
| `value_objects/money.py` | `shared money` helpers | 3 | Decimal → **integer minor units (poisha)**, currency `BDT`, never negative. |
| `value_objects/color_hex.py`, `storefront/.../ThemeStyle.tsx` (+ test) | `modules/site-settings/domain`, design → CSS vars renderer | 3–4 | Keep the **sanitize-before-`<style>`** rule for every admin-controlled value (colors, font ids, opacities). Fonts become ids from the curated list, not free text. |
| `value_objects/{email,sku,address}.py` | Zod schemas | 3 | Address → BD shape (name, phone, area/district, address line). |
| `value_objects/subdomain.py`, `presentation/middleware/tenant_resolver.py` | `server/tenant.ts` | 2 | Same Host → store logic (subdomain, then custom domain, inactive = 404). Add `STORE_MODE=single` fallback. Exempt paths: cron, webhooks, super-admin. |
| `domain/entities/order.py` (+ `tests/unit/domain/test_orders.py`) | `modules/orders/domain` | 3 | Keep the **allowed-transitions table** pattern; replace statuses with spec §5.3 flow. Order totals + item name/price/cost are **snapshotted** at placement. |
| `domain/entities/product.py`, `category.py` (+ `test_product_catalog.py`) | `modules/catalog/domain` | 3 | `adjust_stock` never below 0; `reorder_images` → generic sort_order reordering for categories/products/media. Add cost price. |
| `domain/entities/cart.py` | `modules/orders/domain/cart.ts` | 5 | Guest cart in cookie/localStorage; no customer-auth merge (spec has guest checkout only). |
| `use_cases/orders/checkout.py`, `tests/integration/test_checkout_concurrency.py` | `modules/orders` + `modules/stock` | 3 | **Stock is deducted on CONFIRMED, not checkout** (spec §5.4). Keep the oversell-proof idea via atomic conditional `UPDATE … WHERE stock >= q`; port the concurrency test to PGlite. |
| `use_cases/orders/manage_orders.py` | `modules/orders/application` | 3 | List with filters + paging, status update writes `order_events`. |
| `domain/services/pricing.py` | `modules/orders/domain/pricing.ts` | 3 | Drop flat tax; shipping = delivery-zone charge from settings. |
| `domain/services/plan_limit_policy.py`, `entities/subscription_plan.py` | `modules/plans/domain` | 3 | Pure policy with no I/O — keep. Limits become entitlements (§5.10) + optional numeric limits. No Stripe. |
| `domain/entities/{store_settings,theme}.py`, `use_cases/themes/*` (+ `test_store_customization.py`, `test_theme_use_cases.py`) | `modules/site-settings` | 3–4 | Theme vs store settings split = same idea as spec (theme defaults, settings override). Lazy defaults on first read. `toggle_theme_section` → section on/off in Design page. |
| `use_cases/categories/*` (+ test) | `modules/catalog/application` | 3 | Parent must belong to same store; no cycles; unique slug per store. |
| `presentation/caching.py` | Next cache tags | 5 | "Version counter" invalidation → `revalidateTag(store:<id>:…)` on admin save. |
| `admin-dashboard/.../primitives/{DataTable,FormBuilder,ListView,SideMenu}` (+ tests) | `src/ui` | 4 | Config-driven idea is good (one table/form component for many screens). Rebuild on shadcn + Tailwind; keep the column/field config API shape if it fits. |
| `storefront/.../ProductCard.*` | `themes/minimal` slot | 5 | Reference only; must use tokens + fixed-ratio image box. |
| `backend/src/domain/exceptions` | each module's `domain/errors.ts` | 3 | Domain errors → one mapper to user-facing EN/BN messages (legacy lesson: every validation error mapped uniformly, never a 500). |

## Lessons to carry over (from `docs/decisions/`)

1. **Tenant context is the recurring bug.** Every path that bypasses normal request flow (cron, webhooks, super-admin, outbox worker) must set store context explicitly. Write a test for each such path. (`README.md`, `phase7-payments.md`, `phase8-plan-limits.md`)
2. If you add Postgres RLS: use `current_setting('app.store_id', true)` (missing-ok form) or unset context errors instead of returning zero rows. (`phase2-auth.md`)
3. Make sure the DB session actually commits — a legacy bug silently dropped every write for a whole phase. Integration tests must read back what they wrote. (`phase2-auth.md`)
4. Idempotency at both app and DB layer (`INSERT … ON CONFLICT DO NOTHING`) for webhooks and the message outbox. (`phase7-payments.md`)
5. Frontend/backend tenant resolution broke on real domains — resolve the store server-side from `Host` only, and e2e-test with a non-localhost host header. (`deployment-hardening.md`)
6. Name simplifications in `PROGRESS.md › Decisions` instead of hiding them.
