# Kế hoạch cải thiện tốc độ phản hồi API/trang — Ecokids

> Mục tiêu: trang chủ + danh sách sản phẩm trả data **gần như tức thì** (TTFB < 200ms với cache hit), thay vì 5–10s như hiện tại.
> Stack liên quan: Next.js 14 App Router · Prisma 5 · Supabase Postgres (pooler ap-northeast-1) · Supabase Auth.

## 0. Câu hỏi chẩn đoán quan trọng nhất (xác nhận trước khi sửa)

**Bạn đang đo 5–10s ở `next dev` hay ở bản build production (`next build && next start`)?**

- `next dev` **biên dịch route theo yêu cầu (on-demand compile)** — lần đầu vào mỗi trang mất **3–8s là bình thường** và KHÔNG phản ánh tốc độ thật khi deploy. Nếu bạn đang test ở dev → một phần lớn "5–10s" là do compile, không phải DB.
- Cách kiểm tra nhanh: chạy `npm run build && npm run start`, vào lại trang. Nếu nhanh hẳn ⇒ phần lớn vấn đề là dev-mode, chỉ cần lo phần caching/DB cho production. Nếu vẫn 5–10s ⇒ làm theo toàn bộ kế hoạch dưới.

---

## 1. Nguyên nhân gốc (xếp theo mức độ tác động)

| # | Nguyên nhân | Bằng chứng | Vì sao chậm |
|---|-------------|-----------|-------------|
| 1 | **`force-dynamic` + KHÔNG cache trên trang chủ & danh sách SP** | `src/app/(storefront)/page.tsx:19`, `src/app/(storefront)/products/page.tsx:19`; toàn repo **không có** `unstable_cache`/`revalidate`/`cache()` | Mỗi lượt truy cập chạy lại **6+ query DB giống hệt nhau** + 1 round-trip Supabase Auth. Data trang chủ giống nhau cho mọi khách nhưng tính lại mỗi request. |
| 2 | **Supabase `auth.getUser()` trong `<Header>` chạy mỗi request, không cache, gọi tới 3× ở trang chi tiết** | `src/components/storefront/Header.tsx:17-18` → `src/lib/server/user-actions.ts:15-33`; `getCurrentUser` không bọc `cache()` | `auth.getUser()` là **network call tới Supabase** (200–800ms, có khi vài giây khi cold). Header await nó → chặn render mọi trang storefront trước khi data sản phẩm kịp ra. |
| 3 | **Pooler/pgbouncer có thể thiếu `connection_limit`** | `src/lib/prisma.ts` không set `connection_limit`; phụ thuộc hoàn toàn vào chuỗi `DATABASE_URL` | Nếu URL pooled không có `?pgbouncer=true&connection_limit=1`, Prisma có thể làm nghẽn pooler → treo vài giây. |
| 4 | **Chuỗi `DATABASE_URL` trong `.env.local` nghi có `@` chưa URL-encode** | `.env.local` hiển thị dạng `...:***@z@aws-1-...` (2 dấu `@`) | Mật khẩu chứa `@` thô khiến parse URL không ổn định ⇒ kết nối chập chờn/chậm. **Cần encode `@`→`%40`.** |
| 5 | **`log: ['query']` bật ở dev** | `src/lib/prisma.ts:10` | In mọi câu SQL ra console, làm phồng latency khi đo ở dev. |
| 6 | **Thiếu index cho bộ lọc/sắp xếp** | `prisma/schema.prisma` thiếu index cho `gender`, `ageRange`, `basePrice`, `comparePrice` | Lọc theo giới tính/độ tuổi/giá hoặc sort theo giá ⇒ seq scan. |
| 7 | **Quét toàn bảng trong báo cáo admin** | `src/lib/queries/reports.ts:220-254` (low-stock, slow-moving) load hết product+variant rồi sum/filter bằng JS, không `take` | Admin reports chậm dần theo dữ liệu. |
| 8 | **Region DB = Tokyo (ap-northeast-1)** trong khi `.env.example` ghi Singapore (ap-southeast-1) | so sánh `.env.local` vs `.env.example` | Mỗi round-trip từ VN tới Tokyo ~70–100ms; cộng dồn khi có nhiều query tuần tự. |

> Lưu ý quan trọng: **các query đã viết tốt** (có `select`/`include` gọn, `take`, `Promise.all`, full-text search có GIN index). Vấn đề chính là **caching + auth round-trip + connection**, KHÔNG phải N+1.

---

## 2. Kế hoạch sửa — theo thứ tự ưu tiên (impact/effort)

### 🟢 Quick wins (vài phút–1 giờ, tác động lớn nhất)

1. **Bỏ `log: ['query']` ở dev** — `src/lib/prisma.ts:10` → đổi thành `['error']` (hoặc gate sau `process.env.PRISMA_LOG`).
2. **Xác minh & sửa `DATABASE_URL`**:
   - Đảm bảo URL pooled (port 6543) kết thúc bằng `?pgbouncer=true&connection_limit=1`.
   - Encode mọi ký tự đặc biệt trong password (`@`→`%40`, `#`→`%23`, …).
   - `DIRECT_URL` (port 5432) chỉ dùng cho migrate, KHÔNG cần pgbouncer.
3. **Bọc `getCurrentUser` bằng React `cache()`** — `src/lib/server/user-actions.ts:15` → 1 request chỉ gọi auth 1 lần thay vì 3×.

### 🟡 Caching (1–3 giờ — đây là đòn bẩy lớn nhất cho "tức thì")

> ⚠️ **Đã học khi triển khai:** KHÔNG bỏ `force-dynamic` ở trang chủ — nếu bỏ, Next sẽ cố prerender `/` lúc `build` và cần DB lúc build (build fail nếu DB không reachable). `unstable_cache` **vẫn cache ở runtime kể cả khi trang `force-dynamic`**, nên cứ giữ `force-dynamic` + bọc query bằng `unstable_cache` là được lợi ích cache mà không vỡ build. (Đây là cách đã làm thực tế.)

4. **Trang chủ**: giữ `force-dynamic` ở `(storefront)/page.tsx`; bọc từng query trong `src/lib/queries/storefront.ts` bằng:
   ```ts
   import { unstable_cache } from "next/cache";
   export const getBestSellers = unstable_cache(_getBestSellers, ["best-sellers"], {
     revalidate: 300, tags: ["products"],
   });
   ```
   Rồi gọi `revalidateTag("products")` trong các mutation đã có ở `src/lib/server/products.ts`/`banners.ts`.
5. **Danh sách SP**: giữ `force-dynamic` ở `products/page.tsx` (trang phụ thuộc `searchParams`); cache `getFilterFacets()` (`product-list.ts`, giống nhau cho mọi user) với `revalidate: 300`. `searchProducts` để live cho kết quả chính xác.
6. **Tách UI phụ thuộc đăng nhập ra client component** (cart count, user menu đọc session client-side) để trang storefront có thể ISR/cache tĩnh, không bị chặn bởi auth server-side.
7. **Trang chi tiết SP**: thêm `generateStaticParams` + `revalidate` cho `(storefront)/products/[slug]` (hiện chưa có) ⇒ render tĩnh + ISR.

### 🟠 Index DB (cần migration — thao tác cẩn thận, xem §3)

8. Thêm vào `prisma/schema.prisma` model `Product`:
   - `@@index([status, basePrice])` — lọc/sort theo giá
   - `@@index([status, gender])` — nav theo giới tính
   - Index `comparePrice` (partial, cho filter `onSale`)
   - `ageRange`: cần **GIN index** qua raw SQL migration: `CREATE INDEX CONCURRENTLY "Product_ageRange_idx" ON "Product" USING GIN ("ageRange");`

### 🔵 Tối ưu báo cáo admin (khi rảnh)

9. Viết lại `getLowStockProducts`/`getSlowMovingProducts` (`reports.ts:220-254`) đẩy `SUM`/`HAVING`/`LIMIT` xuống SQL bằng `groupBy` hoặc raw query, thay vì sum bằng JS.

### ⚪ Hạ tầng (cân nhắc dài hạn)

10. Nếu khách hàng chủ yếu ở VN: cân nhắc đổi region Supabase về **ap-southeast-1 (Singapore)** — gần VN hơn Tokyo. *Lưu ý: đổi region = tạo project mới + migrate data, là việc nặng.*
11. GĐ2 đã có kế hoạch **Upstash Redis** cho rate-limit/cache — có thể dùng làm cache layer cho query nóng nếu cần.

---

## 3. Lưu ý an toàn khi thực hiện (theo §0 quy tắc)

- **Index = migration trên DB thật (Supabase)**. KHÔNG chạy `prisma migrate dev` lên prod. Quy trình: tạo migration → review SQL → `prisma migrate deploy`. Dùng `CREATE INDEX CONCURRENTLY` để không khóa bảng. (Xem memory: dùng `migrate deploy` không phải `migrate dev` với Supabase.)
- **Backup/branch trước khi đổi schema.**
- Thay đổi caching không phá data nhưng cần test kỹ phần **revalidate** (đảm bảo admin sửa SP thì storefront cập nhật) — đây là rủi ro chính của bước caching.
- Sửa `.env.local` không commit (đã trong `.gitignore`); chỉ cập nhật `.env.example` dạng mẫu.

---

## 4. Kỳ vọng kết quả

| Giai đoạn fix | TTFB trang chủ kỳ vọng |
|---------------|------------------------|
| Hiện tại | 5–10s |
| Sau quick wins (1–3) | giảm đáng kể nếu nguyên nhân là log/connection/auth |
| Sau caching (4–7) | **< 200ms với cache hit** (đa số lượt truy cập) |
| Sau index (8) | trang lọc/sort nhanh & ổn định khi data lớn |
