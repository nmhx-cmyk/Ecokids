# Code conventions — Ecokids

Quy ước code cho contributor. Áp dụng cho mọi PR; reviewer reject nếu vi phạm.

---

## Naming

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| File / folder | `kebab-case` | `product-card.tsx`, `order-status/` |
| React component | `PascalCase` (export) + file `kebab-case` | `export function ProductCard()` trong `product-card.tsx` |
| Function / variable | `camelCase` | `getProductById`, `cartTotal` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_IMAGE_SIZE_BYTES` |
| Type / interface | `PascalCase` | `type CartItem`, `interface ServerActionResult` |
| Zod schema | `camelCase` + suffix `Schema` | `createProductSchema` |
| DB model (Prisma) | `PascalCase` singular | `Product`, `OrderItem` |

---

## Server vs Client Component

- **Server Component là mặc định.** Mọi file `.tsx` trong `app/` là Server Component trừ khi có `'use client'` ở đầu file.
- Chỉ dùng `'use client'` khi cần: state, effect, event handler, browser API.
- Pattern: wrapper Server Component fetch data → render Client Component nhận data qua props.

```tsx
// app/products/page.tsx  (Server)
export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductGrid products={products} />;
}

// components/storefront/product-grid.tsx  (Client)
'use client';
export function ProductGrid({ products }: { products: Product[] }) {
  // useState, onClick...
}
```

---

## Validations

- Mọi input có schema Zod trong `lib/validations/`.
- **Share schema giữa FE và BE**: form dùng `zodResolver`, Server Action parse lại bằng schema y hệt.

```ts
// lib/validations/order.ts
export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  recipientName: z.string().min(1),
  // ...
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
```

---

## Server Actions

- Return `ServerActionResult<T>`:

```ts
type ServerActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

- **Không throw** cho lỗi nghiệp vụ (validation fail, business rule). Return `{ success: false }`.
- **Throw** chỉ khi infrastructure fail (DB down, Prisma error không xử lý được) — Next.js render error boundary.

---

## Database writes

- **Luôn qua Prisma.** Không bao giờ string-concat SQL.
- **Raw SQL chỉ dùng cho:**
  - Full-text search với `unaccent` (xem `lib/search.ts`)
  - Sequence cho order code
- Mọi transaction multi-table dùng `prisma.$transaction([...])`.

---

## Money

- **Lưu Int VND.** Không bao giờ float, không bao giờ string.
- Hiển thị: helper `formatVND(amount: number)` trong `lib/format.ts` → `"125.000 ₫"`.
- Input từ user (form): zod `coerce.number().int().nonnegative()`.

---

## Image upload

- Mọi upload đi qua `POST /api/upload` — admin gate (check role server-side).
- Upload chunk thẳng lên Supabase Storage bucket `product-images` (public).
- Trả về `{ url, path }`. Path lưu vào `ProductImage.url`.
- File size validate cả FE (UX) lẫn BE (security).

---

## i18n

- GĐ1: VN microcopy **hardcode** trong component / page.
- Để chuẩn bị GĐ2:
  - Tránh string concat khó dịch (`"Có " + count + " sản phẩm"` → dùng template).
  - Số nhiều dùng `formatVietnamese()` nếu phức tạp.
- GĐ2: cài `next-intl`, extract sang `locales/vi.json` / `en.json`.

---

## Testing

### Unit (Vitest)
- Test logic thuần: helpers (`lib/format.ts`, `lib/pricing.ts`), Zod schemas, reducers.
- File `*.test.ts` cạnh source.
- Không mock DB — dùng helper pure functions.

### Component (Vitest + Testing Library)
- Test behavior, không test implementation (no `expect(component.state.x)`).
- Render → user event → assert DOM.

### E2E (Playwright)
- Smoke tests cho 3 flow critical: register → browse → checkout COD.
- File `e2e/*.spec.ts`.
- Chạy trên CI trước merge.

---

## Commit messages

Conventional Commits:

```
feat: add Google OAuth login
fix(cart): persist on reload
refactor(orders): extract status workflow
test(checkout): cover free shipping threshold
docs: update deploy guide for custom domain
chore: bump prisma to 5.x
```

Một logical change / commit. Imperative mood.

---

## Pre-PR checklist

- [ ] `pnpm typecheck` pass
- [ ] `pnpm lint` pass
- [ ] `pnpm test` pass
- [ ] Đã thêm test cho logic mới
- [ ] Đã update doc nếu đổi convention / decision
- [ ] Không commit `.env`, secrets, file > 1MB
