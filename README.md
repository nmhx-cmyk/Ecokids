# Ecokids — Thời trang trẻ em

Cửa hàng thương mại điện tử thời trang trẻ em với trải nghiệm mua sắm nhanh, gọn, thân thiện cho phụ huynh Việt. Sản phẩm MVP (GĐ1) gồm storefront, giỏ hàng, thanh toán COD/chuyển khoản và trang quản trị.

**Stack:** Next.js 14 · TypeScript · Prisma · Supabase · Tailwind · Vercel

## Quick start

```bash
pnpm install
cp env.example .env.local   # fill in real values
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed         # creates admin + test users + 20 products
pnpm dev
```

Mở `http://localhost:3000`. Đăng nhập admin tại `/admin` với credential từ `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## Environment variables

Xem `env.example` để biết danh sách đầy đủ. Tóm tắt các biến bắt buộc:

| Biến | Mục đích |
|---|---|
| `DATABASE_URL` | Postgres connection string (Supabase pooler) |
| `DIRECT_URL` | Direct Postgres URL (dùng cho migrate) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, upload ảnh) |
| `NEXT_PUBLIC_SITE_URL` | URL public của site (dùng cho auth callback) |
| `NEXT_PUBLIC_SHIPPING_FEE` | Phí ship phẳng (VND, mặc định `30000`) |
| `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD` | Ngưỡng miễn ship (VND, mặc định `500000`) |
| `NEXT_PUBLIC_BANK_NAME` | Tên ngân hàng hiển thị checkout |
| `BANK_ACCOUNT_NUMBER` | Số tài khoản nhận chuyển khoản |
| `BANK_ACCOUNT_HOLDER` | Chủ tài khoản |
| `SEED_ADMIN_EMAIL` | Email admin được tạo bởi seed |
| `SEED_ADMIN_PASSWORD` | Password admin được tạo bởi seed |

## Project structure

```
src/
  app/                Next.js App Router
    (storefront)/     Customer-facing pages
    (auth)/           Login / register / etc.
    admin/            Admin dashboard
    api/              REST endpoints
  components/         UI primitives, storefront, admin, account
  lib/                Server utilities, queries, validations, constants
  stores/             Zustand cart store
  hooks/              Client React hooks
prisma/               Schema + migrations + seed
e2e/                  Playwright smoke tests
docs/                 Project docs (this folder)
```

## Scripts

| Script | Mô tả |
|---|---|
| `pnpm dev` | Chạy dev server (port 3000) |
| `pnpm build` | Build production |
| `pnpm start` | Chạy production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright E2E smoke tests |
| `pnpm db:migrate` | Prisma migrate deploy |
| `pnpm db:seed` | Seed admin + test data |
| `pnpm db:studio` | Mở Prisma Studio |
| `pnpm format` | Prettier format |

## Docs

- [Decisions log](docs/decisions.md) — quyết định kỹ thuật & business logic GĐ1
- [Admin guide](docs/admin-guide.md) — hướng dẫn dùng trang quản trị
- [Deploy guide](docs/deploy-guide.md) — deploy lên Vercel
- [UAT checklist](docs/uat-checklist-gd1.md) — danh sách kiểm thử trước launch
- [Operations runbook](docs/runbook.md) — vận hành, backup, troubleshoot
- [Conventions](docs/conventions.md) — quy ước code cho contributor
