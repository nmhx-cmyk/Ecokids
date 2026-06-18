# Deploy guide — Ecokids lên Vercel

Hướng dẫn đưa Ecokids lên production trên Vercel + Supabase.

---

## 1. Chuẩn bị

- Tài khoản Vercel (free tier ok).
- Project Supabase đã tạo, đã chạy migration và seed ở local (xem `README.md`).
- Domain (nếu có) hoặc dùng tạm `*.vercel.app`.
- Sao chép sẵn các giá trị env từ `.env.local` để paste lên Vercel.

---

## 2. Push code lên GitHub

```bash
git init && git branch -M main
git remote add origin https://github.com/nmhx-cmyk/Ecokids.git
git add . && git commit -m "feat: Ecokids GĐ1 MVP"
git push -u origin main
```

Đảm bảo `.gitignore` đã loại trừ `.env.local`, `node_modules`, `.next`.

---

## 3. Import vào Vercel

1. Đăng nhập [vercel.com](https://vercel.com), nhấn **"Add New Project"**.
2. Chọn repo `Ecokids` vừa push.
3. Vercel tự nhận diện framework **Next.js** — giữ nguyên các default.
4. **Chưa nhấn Deploy** — sang bước 4 cấu hình env trước.

---

## 4. Env vars trên Vercel

Trong Project Settings → Environment Variables, nhập từng biến. Set scope `Production` + `Preview` cho phần lớn, riêng vài biến sensitive chỉ `Production`.

| Biến | Production | Preview | Ghi chú |
|---|:-:|:-:|---|
| `DATABASE_URL` | ✅ | ✅ | Supabase pooler URL (port 6543) |
| `DIRECT_URL` | ✅ | ✅ | Direct URL (port 5432), dùng cho migrate |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ | Server-only, không leak preview |
| `NEXT_PUBLIC_SITE_URL` | ✅ | ✅ | URL Vercel preview/prod |
| `NEXT_PUBLIC_SHIPPING_FEE` | ✅ | ✅ | `30000` |
| `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD` | ✅ | ✅ | `500000` |
| `NEXT_PUBLIC_BANK_NAME` | ✅ | ✅ | |
| `BANK_ACCOUNT_NUMBER` | ✅ | ❌ | |
| `BANK_ACCOUNT_HOLDER` | ✅ | ❌ | |
| `SEED_ADMIN_EMAIL` | ✅ | ❌ | Chỉ cần khi chạy seed lần đầu |
| `SEED_ADMIN_PASSWORD` | ✅ | ❌ | |

Sau khi nhập đủ → nhấn **Deploy**.

---

## 5. Cấu hình Supabase Auth Site URL

Supabase cần biết URL nào được phép callback.

1. Vào Supabase Dashboard → Authentication → **URL Configuration**.
2. **Site URL**: nhập URL Vercel production (ví dụ `https://ecokids.vercel.app`).
3. **Redirect URLs**: thêm các URL:
   - `https://ecokids.vercel.app/**`
   - `https://*-yourteam.vercel.app/**` (cho preview deploys)
   - `http://localhost:3000/**` (cho dev)

---

## 6. Cấu hình Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → tạo OAuth 2.0 Client ID.
2. **Authorized redirect URI**: `https://<your-supabase-ref>.supabase.co/auth/v1/callback`.
3. Copy Client ID + Secret.
4. Vào Supabase Dashboard → Authentication → Providers → Google → bật, paste credentials.
5. Test login Google ở production.

---

## 7. Apply migration on production DB

Vercel build chạy `pnpm prisma generate` tự động (đã add vào `postinstall`). Migration phải apply thủ công lần đầu:

```bash
# Trên máy local, dùng prod DATABASE_URL
DATABASE_URL="<prod-url>" DIRECT_URL="<prod-direct-url>" pnpm prisma migrate deploy
```

Hoặc thêm `prisma migrate deploy` vào Vercel **Build Command** nếu muốn auto-migrate mỗi deploy:

```
prisma migrate deploy && next build
```

> Cẩn thận: auto-migrate có rủi ro với migration phá huỷ. Khuyến nghị chạy thủ công cho GĐ1.

---

## 8. Run seed (optional)

**Chỉ chạy khi DB rỗng**, KHÔNG BAO GIỜ chạy trên DB có dữ liệu thật:

```bash
DATABASE_URL="<prod-url>" pnpm prisma db seed
```

Seed sẽ tạo: 1 admin (từ `SEED_ADMIN_EMAIL`), 3 user test, 20 sản phẩm mẫu, danh mục cơ bản.

---

## 9. Smoke test sau deploy

Đi qua các flow chính:

1. Đăng ký user mới bằng email → login OK.
2. Đăng nhập Google → callback OK, profile tạo trong `User` table.
3. Thêm sản phẩm vào giỏ → checkout COD → đơn tạo, mã `ECO-2026-NNNNNN`.
4. Login admin → vào `/admin` → confirm đơn vừa tạo.
5. Reload trang → giỏ hàng persist (Zustand localStorage).

---

## 10. Custom domain (sau)

Khi đã mua domain (ví dụ `ecokids.vn`):

1. Vercel → Project → Settings → Domains → **Add**.
2. Vercel hiển thị bản ghi DNS cần cấu hình.
3. Trên nhà cung cấp domain:
   - Bản ghi `A` cho root: `76.76.21.21`
   - Bản ghi `CNAME` cho `www`: `cname.vercel-dns.com`
4. Đợi DNS propagate (vài phút đến 24h).
5. **Cập nhật**:
   - `NEXT_PUBLIC_SITE_URL` env → URL mới.
   - Supabase Auth Site URL + Redirect URLs (bước 5).
   - Google OAuth authorized origins.

---

## Troubleshooting

| Lỗi | Nguyên nhân | Khắc phục |
|---|---|---|
| `Auth callback failed` | Site URL trong Supabase chưa khớp | Bước 5, thêm URL Vercel |
| `Row level security policy violation` | RLS bật nhưng query chưa dùng anon key đúng | Kiểm tra dùng `createServerClient` cho server, `createBrowserClient` cho client |
| `Environment variable not found: DATABASE_URL` | Chưa set env hoặc set sai scope | Bước 4, set lại + redeploy |
| `Prisma Client not generated` | Build không chạy `prisma generate` | Đảm bảo `postinstall` script có `prisma generate` |
| Image upload 500 | `SUPABASE_SERVICE_ROLE_KEY` thiếu hoặc bucket chưa tạo | Tạo bucket `product-images` public trên Supabase Storage |
| `relation "order_code_seq_2026" does not exist` | Migration sequence chưa apply | Chạy `prisma migrate deploy` trên prod |
