# Ecokids — Claude project notes

Ecokids is a Vietnamese kids' fashion e-commerce MVP (GĐ1) built on Next.js 14 + Supabase.

## Stack
- Next.js 14 (App Router) + TypeScript strict
- Prisma + Supabase Postgres (pooler + direct URL)
- Tailwind CSS + Zustand + React Hook Form + Zod
- Path alias: `@/*` → `./src/*`

## Where to find things
- Sprint plans: `../plan/` (read before starting any sprint task)
- Decisions / assumptions: `docs/decisions.md`
- Admin user manual: `docs/admin-guide.md`
- Deploy steps: `docs/deploy-guide.md`
- Ops runbook: `docs/runbook.md`
- Code conventions: `docs/conventions.md`

## Rules
- **Always read `docs/decisions.md` before changing schema or pricing logic.** Decisions there are load-bearing (e.g., money as Int, order code sequence per year, shipping flat fee from env).
- **Run `pnpm typecheck && pnpm lint` after edits.** TS errors are your errors — fix before reporting done.
- **Money values are integers (VND).** Never use floats, never store as string. Display via `formatVND()`.
- **Postgres FTS uses `unaccent`** — search queries auto-strip diacritics. Don't add manual diacritic stripping client-side.
- Reply tiếng Việt khi user hỏi tiếng Việt. Code/comment/commit always English.
- Server Components by default. `'use client'` only when state/effect/browser API needed.
