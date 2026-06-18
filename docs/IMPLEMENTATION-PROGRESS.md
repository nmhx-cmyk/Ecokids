# Implementation Progress — PayOS + GĐ2 (handoff)

> Living handoff doc. A fresh session should read this first, then continue from
> "Remaining work". Update it as tasks complete.

## Context / scope (confirmed with owner 2026-06-18)

- Goal: finish the **full project** — complete GĐ1 (MVP) and build GĐ2 (full features).
- **Payment = COD + PayOS.** PayOS replaces the manual bank transfer (and replaces the
  VNPay/MoMo/ZaloPay that the Excel plan had in GĐ2 — one gateway only).
- Unpaid PayOS order → **link expires (24h) → auto-cancel + restore stock.**
- **Shipping = admin-update only** (no GHN/GHTK deep integration). Keep flat fee + admin
  status workflow; GĐ2 only adds a manual tracking-code field.
- Coverage check done: `plan/` folder fully matches `kids_fashion_project_plan.xlsx` for both
  phases. GĐ1 was already ~95% coded; GĐ2 was only an outline (not coded).

## Working branch

`feat/payos-and-phase2` (off `main`). Nothing committed yet (owner commits when ready).

## Baseline + current gate status

- `pnpm typecheck` ✓ clean
- `pnpm lint` ✓ clean
- `pnpm test` ✓ 14 passed (added PayOS tests)
- `pnpm build` — **NOT run yet** (verify before declaring PayOS fully done)
- E2E (`pnpm test:e2e`) — not run

## DONE: PayOS integration (GĐ1 payment)  ✅ code-complete, build unverified

DB migration **applied to the live Supabase dev DB** (`20260620_payos_payment`): added
`PAYOS` to `PaymentMethod` enum; added `Order.payosOrderCode (BigInt unique)`,
`paymentLinkId`, `paymentCheckoutUrl`, `paymentRef`, `paymentExpiresAt`; created sequence
`payos_order_code_seq`; added index on `(status, paymentStatus, paymentExpiresAt)`.

> ⚠️ Prisma `migrate dev` does NOT work here (shadow DB lacks Supabase `auth` schema →
> P3006). Migrations are hand-written SQL + applied with `prisma migrate deploy`.
> A `prisma/migrations/migration_lock.toml` was added (was missing).

Files added:
- `src/lib/payos.ts` — env-gated client (`isPayosConfigured`, `getPayos()`). `@payos/node` v2.
- `src/lib/constants/payment.ts` — central PAYMENT_METHOD/STATUS labels + `PAYOS_EXPIRE_MINUTES`.
- `src/lib/server/payos-payment.ts` — `createPayosCheckout`, `markPayosOrderPaid` (idempotent +
  amount guard), `expireUnpaidPayosOrders` (cron sweep + restock).
- `src/app/api/payos/webhook/route.ts` — verifies HMAC, idempotent PAID, tolerates test ping,
  always 200, `runtime = nodejs`.
- `src/app/api/cron/expire-payos-orders/route.ts` — `CRON_SECRET`-protected sweep.
- `vercel.json` — cron `*/15 * * * *`.
- `src/lib/server/__tests__/payos-payment.test.ts` — 5 tests.
- `vitest.server-only-stub.ts` + alias in `vitest.config.ts` (so `server-only` imports work in tests).

Files modified:
- `src/lib/server/orders.ts` — `placeOrder` now: creates order → if PAYOS, create link (outside
  txn), store link, return `checkoutUrl`; rollback (cancel + restock) if link creation fails.
- `src/lib/validations/order.ts` — checkout `paymentMethod` restricted to `'COD' | 'PAYOS'`.
- `src/components/storefront/CheckoutForm.tsx` — COD + PayOS radio; redirect to `checkoutUrl`.
- order-confirmation page + account order detail — PayOS "pay now" / awaiting / cancel states.
- admin orders list+detail, account OrderListItem, admin-orders query — PAYOS label/type added.
- `docs/decisions.md` — B6 updated, B7 added (PayOS flow + env + ops notes).

### Env vars PayOS needs (owner must set in `.env.local` + Vercel)
`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `NEXT_PUBLIC_APP_URL`,
`CRON_SECRET` (prod), optional `PAYOS_EXPIRE_MINUTES` (default 1440).
Missing creds → PayOS checkout returns a friendly error (pick COD); app still runs.

### PayOS follow-ups (not code — ops)
- [ ] `pnpm build` to confirm routes compile.
- [ ] Register webhook URL once: `payos.webhooks.confirm('<APP_URL>/api/payos/webhook')` (or dashboard).
- [ ] No PayOS sandbox — test with a small real transaction; webhook needs public URL (ngrok in dev).
- [ ] `.env.example` should document the new vars (file is permission-blocked from this tool — owner adds).

## GĐ2 — DONE ✅ (all tasks 3–10 code-complete + verified)

Gate after completion: `pnpm typecheck` ✓ · `pnpm lint` ✓ · `pnpm test` ✓ (30 passed) ·
`pnpm build` ✓. DB migrations applied to live Supabase dev DB (5 new migrations,
`20260621`–`20260625`). Search = **Postgres FTS kept (Algolia dropped per owner).**

3. **Reviews + ratings + moderation** — `Review` model + `ReviewStatus` enum; denormalized
   `Product.ratingAvg`/`ratingCount` (recomputed in txn on every moderation/edit/delete).
   Stars on ProductCard + product detail Reviews tab (list + form). Admin `/admin/reviews`
   (approve/reject/reply/delete). Decision G1 in `decisions.md`. Files: `lib/validations/review.ts`,
   `lib/server/reviews.ts`, `lib/queries/reviews.ts`, `components/storefront/{StarRating,ProductReviews}.tsx`,
   `components/admin/ReviewModerationActions.tsx`, `app/admin/reviews/page.tsx`.
4. **Wishlist + comparison** — `WishlistItem` model (DB-backed, login required). Heart + compare
   buttons on ProductCard (refactored so buttons sit outside the `<Link>`). `/account/wishlist`,
   `/compare` (client store, max 4, server-fetched detail table), floating `CompareBar`.
   Files: `lib/server/{wishlist,compare}.ts`, `lib/queries/wishlist.ts`, `stores/{wishlist,compare}-store.ts`,
   `components/storefront/{WishlistButton,CompareButton,CompareBar}.tsx`.
5. **Vouchers + flash sale + admin CRUD** — `Voucher`/`VoucherRedemption`/`FlashSale`/`FlashSaleItem`
   models + `DiscountType` enum; `Order.discountTotal`/`voucherCode`. Pure pricing helpers
   `lib/pricing.ts` (`effectiveUnitPrice`, `computeVoucherDiscount`) + unit tests. `placeOrder`
   applies active flash price (authoritative) and validates+consumes voucher atomically inside the
   serializable txn. Checkout has voucher apply UI (`previewVoucher`). Admin `/admin/vouchers` +
   `/admin/flash-sales` CRUD. Homepage Flash Sale section.
6. **Transactional email (Resend, env-gated)** — `lib/email.ts` (fetch to Resend HTTP API, no SDK),
   VN HTML templates, senders in `lib/server/emails/`. Wired into `placeOrder` (order placed),
   `updateOrderStatus` (status change), `markPayosOrderPaid` (payment received). No key → no-op.
7. **Returns/refunds + tracking** — `Order.trackingCode` (admin-only) + `ReturnRequest` model +
   `ReturnStatus` enum. Customer requests return on COMPLETED orders (`/account/orders/[code]`),
   admin resolves at `/admin/returns` (approve/reject/refund → restock + paymentStatus REFUNDED).
   Tracking editor on admin order detail; tracking shown to customer.
8. **Admin advanced** — `Banner` model + homepage CMS with **dnd-kit** reorder (`/admin/banners`),
   homepage `BannerCarousel`. Customer management (`/admin/customers` list+detail, read-only).
   Review moderation UI (from task 3). New sidebar nav for all of the above.
9. **Reports + Excel export** — `/admin/reports` (revenue by day, top products, top customers via
   groupBy on COMPLETED orders) + `/api/admin/reports/export` (SheetJS `xlsx`, admin-gated).
10. **Optimization** — PWA `manifest.ts`, env-gated GA4 (`NEXT_PUBLIC_GA_ID`), Organization JSON-LD,
    env-gated Upstash rate-limit on login/register. Search stays Postgres FTS.

### New env vars (all optional — features no-op / use defaults if unset)
`RESEND_API_KEY`, `RESEND_FROM` (email) · `NEXT_PUBLIC_GA_ID` (analytics) ·
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate-limit) ·
`NEXT_PUBLIC_BRAND_NAME` (manifest/JSON-LD, defaults "Ecokids"). PayOS vars unchanged.

### New deps installed
`xlsx` (reports export) · `@dnd-kit/core`,`@dnd-kit/sortable`,`@dnd-kit/utilities` (banner reorder)
· `recharts` (revenue line chart).

### GĐ2 gap-closure pass (after plan audit) — DONE ✅
Migration `20260626_review_images`. Gate re-run green (typecheck/lint/test 30/build 37 pages).
1. **Ảnh trong review** — `Review.images String[]`. Customers upload up to 5 photos in the review form
   (`/api/upload` extended so non-admins can write to `product-images/reviews/<userId>`); shown in the
   review list + admin moderation. (`components/storefront/ProductReviews.tsx`, `validations/review.ts`,
   `server/reviews.ts`, `queries/reviews.ts`, `app/api/upload/route.ts`.)
2. **Countdown flash sale** — `FlashCountdown` client component; homepage Flash Sale header counts down to
   the nearest active sale end; product detail shows a flash badge + countdown + sale price, and the cart
   uses the flash price (placeOrder stays authoritative). (`getActiveFlashForProduct`,
   `getNearestFlashSaleEnd` in `queries/flash-sales.ts`; `ProductInfo.tsx`.)
3. **PDF phiếu giao** — print-optimized page `/admin/orders/[code]/label` (browser → "Lưu PDF", renders
   Vietnamese correctly; no jsPDF font issues) + "In phiếu giao" button on admin order detail.
4. **Reports nâng cao** — Recharts revenue line chart; AOV + new/returning customer metrics; low-stock &
   slow-moving product tables; Excel export extended (`low-stock`, `slow-moving`).

### Plan items intentionally NOT built (owner-confirmed descope or optional)
Algolia (→ Postgres FTS), VNPay/MoMo/ZaloPay (→ PayOS), GHN/GHTK (→ admin-only shipping), Web Push
(optional), wishlist share-link, customer VIP tiers, GTM funnel, PWA offline service worker. Document/raise
with owner if any are wanted later.

### Follow-ups (ops, not code)
- [ ] Add the new env vars to `.env.example` + Vercel (owner — file is permission-blocked here).
- [ ] PWA icons `/public/icon-192.png` + `/icon-512.png` (referenced by manifest; add real assets).
- [ ] If using rate-limit/analytics/email in prod, set the env vars above.

### Conventions to respect (from ecokids/CLAUDE.md + docs/conventions.md)
- Money = Int VND, `formatVND()`. Server Components by default. Zod schemas in `lib/validations`.
- Server actions return `ServerActionResult<T>`. Prisma only (no raw SQL except FTS/sequences).
- New migrations: hand-write SQL + `pnpm exec dotenv -e .env.local -- prisma migrate deploy`.
- After edits: `pnpm typecheck && pnpm lint && pnpm test`; build before "done".
- Reply Vietnamese; code/comments/commits English.
