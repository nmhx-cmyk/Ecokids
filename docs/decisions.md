# Decisions log — Ecokids GĐ1

Tài liệu này ghi lại các quyết định/giả định đã đưa ra trong quá trình triển khai Phase 1, đối chiếu với `plan/03-open-questions.md`. Mỗi mục có lý do và hướng thay đổi sau này.

---

## A. Sản phẩm & danh mục

### A1. Hệ size — combo
**Quyết định:** Lưu hai trường: `size` (mã chuẩn, ví dụ `"3T"`) + `sizeNote` (chú thích chi tiết, ví dụ `"95-100cm, 14-16kg"`).

**Lý do:** Phụ huynh quen với cả hai dạng (số tuổi và đo chiều cao/cân). Hiển thị combo giúp giảm hỏi đáp pre-sale. Tách trường để có thể lọc theo `size` chuẩn nhưng vẫn linh hoạt mô tả.

**Đổi sau này:** Khi cần bảng size theo brand/dòng sản phẩm, thêm bảng `SizeChart` 1-n với `Category`. Không cần đổi schema `ProductVariant`.

### A2. Màu — free text + hex
**Quyết định:** Mỗi variant có `colorName` (string, ví dụ `"Xanh navy"`) và `colorHex` (nullable, ví dụ `"#1e3a8a"`). UI render swatch nếu có hex, chỉ chữ nếu không.

**Lý do:** Bảng màu đóng (enum) không phù hợp khi shop nhập hàng đa nguồn. Hex tuỳ chọn để admin không bắt buộc nhập khi vội.

**Đổi sau này:** Có thể bổ sung bảng `Color` master và FK từ variant nếu muốn quản trị tập trung.

### A3. Cấu trúc danh mục — 2 cấp
**Quyết định:** Bảng `Category` self-reference qua `parentId`. Tối đa 2 cấp (parent + child). FK `onDelete: SetNull` để bảo toàn dữ liệu khi xoá parent.

**Lý do:** Catalog GĐ1 không cần cây sâu (ví dụ `Bé trai > Áo`, `Bé gái > Váy`). 2 cấp đủ cho navigation và breadcrumb mà không phức tạp query.

**Đổi sau này:** Schema đã hỗ trợ N cấp ở mức DB. Chỉ cần đổi UI navigation nếu muốn nested deeper.

### A4. Brand — bỏ qua GĐ1
**Quyết định:** Không có bảng `Brand`. Giả định shop bán dưới một thương hiệu duy nhất (Ecokids).

**Lý do:** Multi-brand làm phức tạp filter và admin UI mà không có giá trị MVP.

**Đổi sau này:** Thêm bảng `Brand` + FK nullable vào `Product`, backfill `null` cho data cũ, bổ sung filter trên `/products`.

---

## B. Đơn hàng & thanh toán

### B1. Format mã đơn — `ECO-YYYY-NNNNNN`
**Quyết định:** Sinh từ Postgres sequence riêng theo năm. Mặc định đã tạo `order_code_seq_2026`. Code format: `ECO-{year}-{seq padded 6 digits}`.

**Lý do:** Sequence chống trùng và xung đột trong giao dịch song song. Theo năm để dễ thống kê và reset.

**Đổi sau này:** Đầu năm dương lịch mới, chạy migration tạo sequence mới (xem `runbook.md`).

### B2. Phí ship — flat
**Quyết định:** Phí ship cố định lấy từ env `NEXT_PUBLIC_SHIPPING_FEE` (mặc định `30_000` VND). Miễn ship khi tổng đơn ≥ `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD` (mặc định `500_000`).

**Lý do:** GĐ1 chưa tích hợp đơn vị vận chuyển. Flat fee đơn giản, dễ hiểu cho khách.

**Đổi sau này:** Tích hợp GHN/GHTK API; tính theo tỉnh thành/khối lượng. Đổi service-side ở `lib/pricing.ts`.

### B3. Thông tin ngân hàng — đọc từ env
**Quyết định:** `NEXT_PUBLIC_BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_HOLDER` cấu hình qua env. Owner phải điền trước khi launch production.

**Lý do:** Tránh hardcode thông tin tài chính trong code. Cho phép đổi nhanh khi cần.

**Đổi sau này:** Khi có nhiều tài khoản, chuyển sang bảng `PaymentAccount` admin quản lý qua UI.

### B4. Nội dung chuyển khoản
**Quyết định:** Tự sinh theo công thức `<orderCode> <recipientNameNoDiacritics>`. Ví dụ: `ECO-2026-000123 NGUYEN VAN A`.

**Lý do:** Giúp admin reconcile dễ. Không dấu để tránh lỗi ký tự ngân hàng cũ.

**Đổi sau này:** Nếu tích hợp VietQR/Casso, thay bằng QR động sinh từ API.

### B5. Chính sách huỷ
**Quyết định:**
- Khách: chỉ huỷ được khi `status === 'PENDING'`.
- Admin: huỷ được tới trạng thái `CONFIRMED` hoặc `PACKING`.
- Khi huỷ: tự động hoàn kho (cộng lại `stockQty` của các variant) và log `InventoryLog` với `reason = 'ORDER_CANCEL'`.

**Lý do:** Sau `SHIPPING` không huỷ được vì hàng đã ra khỏi kho. Hoàn kho tự động giảm thao tác tay.

**Đổi sau này:** Có thể thêm trạng thái `RETURN_REQUESTED` cho flow hoàn hàng.

### B6. Auto-cancel đơn chưa thanh toán — KHÔNG triển khai GĐ1
**Quyết định:** Không có cron job tự huỷ đơn quá hạn. Admin huỷ thủ công.

**Lý do:** Tránh phụ thuộc background job ở GĐ1; volume đơn dự kiến thấp, admin xem hàng ngày.

**Đổi sau này:** Thêm Vercel Cron + Supabase function chạy mỗi giờ, huỷ đơn `PENDING` quá 48h.

---

## C. Tài khoản & auth

### C1. Xác nhận email — TẮT
**Quyết định:** Supabase Auth tắt email confirmation. User đăng ký xong có thể login luôn.

**Lý do:** Giảm friction MVP; chưa cấu hình SMTP tuỳ chỉnh. Owner phải vào Supabase Dashboard → Authentication → Providers → Email và **tắt "Confirm email"**.

**Đổi sau này:** Khi launch SMTP riêng (Resend/SendGrid), bật lại.

### C2. Đăng nhập SĐT — KHÔNG có GĐ1
**Quyết định:** Chỉ email + password và Google OAuth.

**Lý do:** SMS gateway tốn phí và cần xác minh số tại VN. Hoãn sang GĐ2.

### C3. Profile bắt buộc khi đăng ký
**Quyết định:** Chỉ thu thập `name` + `email` + `password`. Số điện thoại và địa chỉ điền sau khi checkout hoặc trong `/account/profile`.

**Lý do:** Form đăng ký càng ngắn càng tốt cho conversion.

---

## D. Admin

### D1. Route `/admin` cho non-admin → 404
**Quyết định:** Admin layout (`app/admin/layout.tsx`) check role, gọi `notFound()` nếu không phải ADMIN. Trả 404 thay vì 403 để không tiết lộ tồn tại trang admin.

**Lý do:** Security through obscurity nhẹ; không lộ scope app cho user thường.

### D2. First admin — qua seed
**Quyết định:** Chạy `pnpm db:seed` sẽ tạo user admin từ `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` (set `role = 'ADMIN'`).

**Lý do:** Bootstrap đơn giản. Không cần CLI riêng.

**Đổi sau này:** Tạo thêm admin: vào Supabase Studio table editor, sửa `User.role = 'ADMIN'` (xem `runbook.md`).

### D3. Admin 2FA — KHÔNG có GĐ1
**Quyết định:** Chỉ password thường.

**Lý do:** Supabase Auth hỗ trợ 2FA nhưng UX flow phức tạp cho 1 admin.

**Đổi sau này:** Bật TOTP qua Supabase Auth khi có nhiều admin.

---

## E. Locale & currency

### E1/E2. Chỉ VN/VND
**Quyết định:** Toàn bộ UI tiếng Việt hardcode. Tiền tệ VND, format `vi-VN`.

**Lý do:** Đối tượng khách hàng Việt; multi-locale làm chậm dev và tăng surface area lỗi.

**Đổi sau này:** Cài `next-intl`, extract microcopy ra `locales/vi.json`, thêm `en.json` (xem `conventions.md`).

---

## F. Hạ tầng

### F1. Domain — vercel.app mặc định
**Quyết định:** Deploy ra `ecokids.vercel.app`. Custom domain (`ecokids.vn`) cấu hình sau khi mua.

**Lý do:** Cho phép launch nhanh, mua domain song song.

**Đổi sau này:** Xem `deploy-guide.md` mục "Custom domain".

### F2. Email transactional — defaults
**Quyết định:** Dùng email defaults của Supabase Auth (reset password, magic link). Không gửi email custom (order confirmation, etc.).

**Lý do:** Resend/SendGrid cần API key, template, deliverability config. Hoãn sang GĐ2.

**Đổi sau này:** Tích hợp Resend, render email với React Email, gọi từ Server Action sau khi tạo đơn.
