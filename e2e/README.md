# E2E smoke tests (Sprint 6)

Three Chromium-only happy-path checks driven by Playwright:

1. `smoke-browse.spec.ts` — anonymous browse → product detail → add to cart.
2. `smoke-checkout.spec.ts` — logged-in user places a COD order end-to-end.
3. `smoke-admin.spec.ts` — admin confirms a PENDING order.

This is smoke-level coverage. It exercises three critical paths to catch
catastrophic regressions; it is not full coverage.

## Run

```bash
pnpm test:e2e          # headless
pnpm test:e2e:ui       # Playwright UI (interactive debugging)
```

The Playwright config spawns `pnpm dev` on http://localhost:3000 and reuses
an existing server when one is already running locally.

## Required env (for tests 2 and 3)

| Variable             | Default                  | Used by               |
| -------------------- | ------------------------ | --------------------- |
| `TEST_USER_EMAIL`    | `customer1@ecokids.test` | `smoke-checkout`      |
| `TEST_USER_PASSWORD` | `Test1234!`              | `smoke-checkout`      |
| `ADMIN_EMAIL`        | _(none — required)_      | `smoke-admin`         |
| `ADMIN_PASSWORD`     | _(none — required)_      | `smoke-admin`         |

Tests gracefully skip (instead of failing) when their credentials are
missing — CI runs without secrets won't go red.

## Data dependency

All three tests assume `pnpm db:seed` has been run beforehand:

- The home page needs products in the "Sản phẩm bán chạy" section.
- `/products` needs at least one in-stock variant with size + color.
- The admin test prefers a seeded order in `PENDING` status; if the first
  order in the list isn't pending, the action assertion is annotated and
  skipped.

Run the seed first:

```bash
pnpm db:seed
pnpm test:e2e
```
