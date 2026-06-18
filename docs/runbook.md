# Operations runbook — Ecokids

Sổ tay vận hành cho các tác vụ định kỳ và xử lý sự cố.

---

## Backup & restore

### Backup
- **Supabase free tier**: backup tự động hàng ngày, giữ **7 ngày**.
- Xem: Dashboard → Database → Backups.
- **Export thủ công** (khuyến nghị hàng tháng):
  ```bash
  pg_dump "<prod-DATABASE_URL>" --format=custom --no-owner --file=ecokids-$(date +%Y%m%d).dump
  ```
  Lưu file `.dump` ngoài Supabase (Google Drive / S3 cá nhân).

### Restore
- Trong Supabase Dashboard → Database → Backups → chọn snapshot → **Restore**.
- Từ file dump thủ công:
  ```bash
  pg_restore --no-owner --clean --dbname="<target-DATABASE_URL>" ecokids-YYYYMMDD.dump
  ```

---

## Rotate order code sequence năm mới

Đầu tháng 1 hàng năm (hoặc trước khi đơn hàng đầu tiên năm mới phát sinh), tạo sequence mới:

```sql
CREATE SEQUENCE IF NOT EXISTS order_code_seq_2027 START 1;
```

Chạy qua Supabase SQL Editor hoặc:

```bash
psql "<DIRECT_URL>" -c "CREATE SEQUENCE IF NOT EXISTS order_code_seq_2027 START 1;"
```

> Code generator (`lib/order-code.ts`) tự đọc năm hiện tại từ `new Date()` và tham chiếu sequence tương ứng. Nếu sequence chưa tồn tại → lỗi `relation does not exist`.

---

## Tạo thêm admin user

1. User tự đăng ký bằng email muốn cấp quyền admin qua giao diện storefront.
2. Vào Supabase Dashboard → Table Editor → bảng `User`.
3. Tìm row theo email → sửa cột `role` từ `'USER'` thành `'ADMIN'` → Save.
4. User logout/login lại để session cache role mới.

Hoặc qua SQL:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'new-admin@example.com';
```

---

## Reset DB (dev only)

**KHÔNG BAO GIỜ chạy trên production.** Chỉ trên local hoặc Supabase project dev:

```bash
pnpm prisma migrate reset
```

Lệnh này: drop schema → re-apply migrations → chạy seed. Toàn bộ data mất.

---

## Inspect logs

### Vercel
- Dashboard → Project → **Logs** tab.
- Filter theo status code (500), function path, time range.
- Realtime: `vercel logs --follow` (Vercel CLI).

### Supabase Postgres logs
- Dashboard → Logs → **Postgres Logs**.
- Hữu ích cho query slow / error.

### Supabase Auth logs
- Dashboard → Logs → **Auth Logs**.
- Trace login failure, OAuth callback.

---

## Optimize image upload

- Mặc định threshold **2MB/ảnh** ở `lib/upload.ts`.
- Nếu admin phản ánh quá khắt khe:
  ```ts
  // src/lib/upload.ts
  export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // tăng lên 4MB
  ```
- Cân nhắc: tăng threshold → bandwidth Supabase Storage tăng theo. Free tier 1GB/month dễ vượt.
- Giải pháp tốt hơn: dùng `next/image` + Vercel image optimization (đã bật mặc định).

---

## Update Supabase Auth Site URL

Khi domain đổi (mua domain mới, chuyển môi trường):

1. Supabase Dashboard → Authentication → URL Configuration.
2. Cập nhật **Site URL** thành domain mới.
3. Thêm domain mới vào **Redirect URLs** (giữ cả URL cũ một thời gian để tránh đứt session).
4. Cập nhật env `NEXT_PUBLIC_SITE_URL` trên Vercel → redeploy.
5. Cập nhật **Authorized JavaScript origins** + **Authorized redirect URIs** trong Google Cloud Console OAuth client.

---

## Checklist sự cố nhanh

| Triệu chứng | Kiểm tra |
|---|---|
| 500 trên `/checkout` | Vercel logs → tìm Prisma error / sequence missing |
| Login Google fail | Google Console redirect URI + Supabase Auth providers config |
| Upload ảnh 500 | `SUPABASE_SERVICE_ROLE_KEY` set, bucket `product-images` tồn tại + public |
| `/admin` 404 với account đúng | DB `User.role` chưa = `'ADMIN'` |
| Tồn kho âm | Logic concurrent order — kiểm tra `InventoryLog`, audit transactions |
| Đơn không có mã | Sequence năm hiện tại chưa tạo |
