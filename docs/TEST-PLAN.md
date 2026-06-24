# Test Plan toàn diện — Ecokids (Kids Fashion Store)

> Phủ **cả luồng đúng (happy path) lẫn luồng sai (negative/error path)** cho GĐ1 (MVP) + GĐ2 (Full Features), theo `kids_fashion_project_plan.xlsx`.
> Quy ước trạng thái kết quả server action: `{ok:true,data}` hoặc `{ok:false,error:{code,message,field?}}` với code ∈ `VALIDATION, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, STOCK_INSUFFICIENT, INTERNAL` (`src/lib/constants/error-codes.ts`).
> Tiền tệ = số nguyên VND.

## 0. Chiến lược & môi trường

- **Cấp độ test**: (1) Unit (Vitest, `src/**/__tests__`) cho validation/pricing/voucher; (2) Integration cho server actions + Prisma trên DB test; (3) E2E (Playwright, `e2e/`) cho luồng người dùng; (4) Manual/UAT theo `docs/uat-checklist-gd1.md`.
- **Dữ liệu test**: seed (`npm run db:seed`) — cần: ≥1 category cha-con, sản phẩm ACTIVE/ARCHIVED, biến thể có stock 0 / >0, 1 voucher PERCENT + 1 FIXED, 1 flash sale đang chạy, 2 user (USER + ADMIN), 1 order mỗi trạng thái.
- **Tài khoản**: `admin@…` (role ADMIN), `user@…` (role USER), 1 guest (chưa đăng nhập).
- **Biến môi trường cần kiểm 2 trạng thái**: Upstash (rate-limit) bật/tắt; `CRON_SECRET` có/không; PayOS cấu hình/không.
- **Trình duyệt/Thiết bị**: Chrome/Safari/Firefox; mobile (≤375px), tablet (768px), desktop (≥1280px) — kiểm responsive mọi trang chính.

Ký hiệu: ✅ happy path · ❌ negative/error path · 🔒 authorization · 📱 responsive/UI.

---

## 1. STOREFRONT

### 1.1 Trang chủ — `(storefront)/page.tsx`
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| HOME-01 | ✅ | Mở trang chủ có đủ data | Hiện hero banner, danh mục nổi bật, bán chạy, mới nhập, flash sale + countdown |
| HOME-02 | ❌ | Catalog rỗng (không banner/sản phẩm) | Hiện empty state "Sắp có sản phẩm bán chạy"/"Chưa có sản phẩm mới", không crash |
| HOME-03 | ❌ | Flash sale đã hết hạn | Không hiện section flash / countdown về 0 xử lý đúng |
| HOME-04 | 📱 | Mobile/tablet | Layout co giãn, ảnh lazy-load, không tràn ngang |

### 1.2 Danh sách + bộ lọc — `(storefront)/products/page.tsx`
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| PLP-01 | ✅ | Lọc theo category, gender, ageRange, khoảng giá, onSale + sort | Kết quả đúng filter; URL query phản ánh state |
| PLP-02 | ✅ | Phân trang (pageSize=24) | Chuyển trang đúng, skeleton loading khi tải |
| PLP-03 | ❌ | Param rác (`gender=xxx`, `sort=hack`, `page=-5`) | Bị whitelist → bỏ qua, về mặc định (`sort=new`, `page=1`), không lỗi |
| PLP-04 | ❌ | `minPrice > maxPrice` | Không kết quả vô lý / xử lý an toàn |
| PLP-05 | ❌ | Không có kết quả | EmptyState "Không tìm thấy sản phẩm phù hợp" + link xóa filter |
| PLP-06 | ❌ | Category slug không tồn tại | Không crash; metadata fallback |
| PLP-07 | ❌🔒 | XSS trong `q` (`<script>`) | Render escape, không thực thi script |

### 1.3 Chi tiết sản phẩm — `(storefront)/products/[slug]`
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| PDP-01 | ✅ | Mở SP hợp lệ, chọn size+màu, xem gallery | Hiện đủ thông tin, đổi ảnh, bảng quy đổi size |
| PDP-02 | ✅ | Thêm vào giỏ với biến thể còn hàng | Thêm thành công, mini-cart cập nhật |
| PDP-03 | ❌ | Slug không tồn tại / ARCHIVED | Trang 404 (`not-found.tsx`) |
| PDP-04 | ❌ | Biến thể hết hàng | Nút thêm giỏ bị khóa / chặn ở bước đặt hàng |
| PDP-05 | ✅ | Có flash sale | Hiện giá flash + giá gốc gạch |
| PDP-06 | ❌🔒 | Wishlist/đánh giá khi chưa đăng nhập | Trả UNAUTHORIZED / điều hướng login |
| PDP-07 | ❌ | Đánh giá trùng (đã review SP này) | CONFLICT |
| PDP-08 | ✅ | So sánh — thêm tới 4 SP | Thêm OK; SP thứ 5 bị bỏ qua |

### 1.4 Giỏ hàng — `(storefront)/cart` (Zustand, client)
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| CART-01 | ✅ | Thêm/sửa số lượng/xóa, tính tổng | Tổng tiền đúng client-side; persist (localStorage) |
| CART-02 | ❌ | Giỏ trống | EmptyState "Giỏ hàng trống" |
| CART-03 | ❌ | Số lượng vượt tồn kho (`validateCartStock`) | Trả issue `availableStock` < `requested`, chặn checkout |
| CART-04 | ❌ | Biến thể bị xóa sau khi thêm vào giỏ | availableStock=0, cảnh báo |
| CART-05 | ❌ | Giá đổi giữa lúc thêm và checkout | Order tính lại giá đúng phía server (giá client không được tin) |

### 1.5 Checkout — `(storefront)/checkout` → `placeOrder`
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| CHK-01 | ✅ | COD, địa chỉ hợp lệ, giỏ hợp lệ | Tạo order PENDING/UNPAID, trừ stock, sang trang xác nhận |
| CHK-02 | ✅ | PayOS, cấu hình đầy đủ | Tạo order + link thanh toán, redirect PayOS |
| CHK-03 | ✅ | Phí ship: subtotal ≥ 500.000 free, ngược lại +30.000 | Tổng = subtotal + ship − giảm giá |
| CHK-04 | ❌🔒 | Guest vào `/checkout` | Redirect `/login?redirectTo=/checkout` |
| CHK-05 | ❌ | Giỏ rỗng (`items.min(1)`) | VALIDATION "Giỏ hàng đang trống" |
| CHK-06 | ❌ | SP không tồn tại/ARCHIVED khi đặt | NOT_FOUND/CONFLICT |
| CHK-07 | ❌ | `stock < quantity` | STOCK_INSUFFICIENT kèm số còn lại |
| CHK-08 | ❌ | Voucher sai/hết hạn/hết lượt/chưa đạt min/quá giới hạn/user | VALIDATION đúng thông điệp |
| CHK-09 | ❌ | Chọn PayOS nhưng chưa cấu hình | INTERNAL "chọn COD" |
| CHK-10 | ❌ | 2 người mua đơn vị cuối cùng đồng thời | Serializable txn + FOR UPDATE + retry 3×; chỉ 1 thành công, người kia STOCK_INSUFFICIENT |
| CHK-11 | ❌ | Tạo link PayOS lỗi sau khi đã ghi order | Rollback order + hoàn lại stock (INTERNAL) |
| CHK-12 | ❌ | Form thiếu trường/phone sai regex `^(0|\+84)[0-9]{9}$` | VALIDATION theo field |
| CHK-13 | ❌ | Voucher FIXED > tổng đơn (total ≤ 0) | **Cần kiểm: total không âm** (hiện chưa có sàn ở `orders.ts:275`) |

### 1.6 Xác nhận đơn — `order-confirmation/[orderCode]`
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| OC-01 | ✅ | Xem đơn của chính mình | Hiện mã đơn, tóm tắt, trạng thái, hướng dẫn thanh toán |
| OC-02 | ❌🔒 | Xem `orderCode` của người khác | 404 (ownership-scoped) |
| OC-03 | ✅ | PayOS trả về `?payos=return&code=00&status=PAID` | Reconcile với provider; chỉ đánh PAID nếu provider báo PAID |
| OC-04 | ❌🔒 | Giả mạo query `code=00` nhưng provider chưa PAID | KHÔNG đánh dấu đã trả |
| OC-05 | ✅ | `?payos=cancel` | Hiện "Bạn đã hủy thanh toán", đơn giữ nguyên |
| OC-06 | ❌ | Reconcile ném lỗi | Bắt lỗi, trang vẫn render trạng thái unpaid |

### 1.7 Tài khoản — `(storefront)/account/*` (layout `requireUser`)
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| ACC-01 | ❌🔒 | Guest vào `/account` | Redirect login |
| ACC-02 | ✅ | Cập nhật hồ sơ, avatar | Lưu OK; phone validate regex |
| ACC-03 | ❌ | Đổi mật khẩu sai mật khẩu hiện tại | UNAUTHORIZED "Mật khẩu hiện tại không đúng" |
| ACC-04 | ✅ | CRUD địa chỉ + đặt mặc định | Default mutual-exclusion trong txn; ownership-checked |
| ACC-05 | ✅ | Lịch sử đơn (tab trạng thái, phân trang 1–50) | Hiện đúng đơn của mình |
| ACC-06 | ✅ | Hủy đơn (chỉ PENDING) | Thành công; non-PENDING → CONFLICT |
| ACC-07 | ✅ | Yêu cầu trả hàng (chỉ COMPLETED) | Thành công; non-COMPLETED/duplicate → CONFLICT |
| ACC-08 | ✅ | Wishlist thêm/xóa | OK; EmptyState khi rỗng |

---

## 2. AUTH — `(auth)/*` + `auth-actions.ts`
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| AUTH-01 | ✅ | Đăng ký email/password (≥8 ký tự, name 2–100) | Tạo tài khoản, gửi email xác nhận |
| AUTH-02 | ❌ | Mật khẩu < 8 ký tự | VALIDATION |
| AUTH-03 | ❌ | confirmPassword không khớp | VALIDATION |
| AUTH-04 | ❌ | Email đã tồn tại | CONFLICT "Email đã được đăng ký" |
| AUTH-05 | ✅ | Đăng nhập đúng | Vào hệ thống, redirect `redirectTo` |
| AUTH-06 | ❌ | Sai mật khẩu | UNAUTHORIZED "Email hoặc mật khẩu không đúng" |
| AUTH-07 | ❌ | Đăng nhập quá 5 lần/60s (Upstash bật) | CONFLICT "thử quá nhiều lần" |
| AUTH-08 | ❌ | Đăng ký quá 3 lần/3600s (Upstash bật) | CONFLICT |
| AUTH-09 | ✅ | Quên mật khẩu → email reset | Gửi link `/reset-password` |
| AUTH-10 | ❌ | Reset với token hết hạn/đã dùng | INTERNAL "Liên kết có thể đã hết hạn" |
| AUTH-11 | ✅ | Google OAuth | Đăng nhập, callback đổi code lấy session |
| AUTH-12 | ❌ | Callback thiếu `code`/lỗi | Redirect `/login?error=auth_callback_failed` |
| AUTH-13 | ❌🔒 | Open-redirect `next=//evil.com` | Bị chặn (chỉ chấp nhận path bắt đầu `/`, không `//`) |
| AUTH-14 | ❌🔒 | Rate-limit khi Upstash **tắt** | Fails open (không throttle) — ghi nhận rủi ro |

---

## 3. ADMIN (gate = `admin/layout.tsx` → `requireAdmin`)

### 3.1 Authorization matrix (chạy cho **mọi** route admin)
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| ADM-AUTH-01 | 🔒 | Guest mở `/admin/*` | Middleware redirect `/login?redirectTo=…` |
| ADM-AUTH-02 | 🔒 | USER (không admin) mở mọi `/admin/*` | `requireAdmin` → **404 (notFound)**, không phải 200 |
| ADM-AUTH-03 | 🔒 | USER gọi trực tiếp mọi server action admin | FORBIDDEN/404 (mỗi mutation tự gọi `requireAdmin`) |
| ADM-AUTH-04 | 🔒 | Gọi `/api/admin/reports/export` khi guest/USER | 403 |

### 3.2 Chức năng admin
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| ADM-PROD-01 | ✅ | Tạo SP (≥1 ảnh ≤10, ≥1 biến thể), auto-SKU, slug unique | Tạo OK, đúng 1 ảnh primary |
| ADM-PROD-02 | ❌ | Slug/SKU trùng | CONFLICT / P2002 |
| ADM-PROD-03 | ❌ | `comparePrice ≤ basePrice` | VALIDATION |
| ADM-PROD-04 | ❌ | 0 ảnh hoặc 0 biến thể | VALIDATION |
| ADM-PROD-05 | ❌ | Xóa biến thể đang được OrderItem tham chiếu | Chặn (CONFLICT) |
| ADM-PROD-06 | ✅ | Xóa SP có đơn → archive; không đơn → hard delete | Đúng nhánh |
| ADM-CAT-01 | ✅ | CRUD danh mục cha-con | OK |
| ADM-CAT-02 | ❌ | Đặt chính nó/ hậu duệ làm parent (cycle) | Chặn |
| ADM-CAT-03 | ❌ | Xóa danh mục còn con hoặc còn sản phẩm | CONFLICT |
| ADM-ORD-01 | ✅ | Cập nhật trạng thái theo `STATUS_TRANSITIONS` | OK theo state machine |
| ADM-ORD-02 | ❌ | Chuyển trạng thái không hợp lệ | VALIDATION |
| ADM-ORD-03 | ✅ | Hủy đơn (CANCELED) | Hoàn stock + inventory log + gửi email |
| ADM-ORD-04 | ✅ | Cập nhật tracking (≤100), payment status, ghi chú | OK; PAID set paidAt |
| ADM-ORD-05 | ✅ | In phiếu giao (label page) | Render đúng |
| ADM-INV-01 | ✅ | Điều chỉnh tồn kho (≥0, integer) ghi InventoryLog | OK (MANUAL_ADD/REMOVE/STOCK_TAKE) |
| ADM-INV-02 | ❌ | Stock âm/không nguyên | VALIDATION |
| ADM-INV-03 | ✅/❌ | Bulk adjust; biến thể không tồn tại | Cái hợp lệ chạy, cái thiếu bị skip/NOT_FOUND |
| ADM-VOU-01 | ✅ | Tạo voucher PERCENT (1–100)/FIXED, điều kiện min, giới hạn | OK |
| ADM-VOU-02 | ❌ | Code trùng / PERCENT ngoài 1–100 | CONFLICT / VALIDATION |
| ADM-FLASH-01 | ✅ | Tạo/sửa flash sale (endsAt>startsAt, ≥1 item) | OK; update thay item toàn bộ |
| ADM-BAN-01 | ✅ | CRUD + kéo-thả sắp xếp banner (txn) | Thứ tự lưu đúng |
| ADM-REV-01 | ✅ | Duyệt/từ chối đánh giá, trả lời, ẩn | Recompute rating tổng hợp |
| ADM-RET-01 | ✅ | Xử lý trả hàng APPROVED/REJECTED/REFUNDED | REFUNDED hoàn stock + paymentStatus REFUNDED |
| ADM-DASH-01 | ✅ | Dashboard KPI + chart | Số liệu đúng (đơn hôm nay, doanh thu, chờ xử lý, sắp hết hàng) |

---

## 4. API ENDPOINTS — `src/app/api/**`
| ID | Loại | Endpoint | Kịch bản | Kỳ vọng |
|----|------|----------|----------|---------|
| API-WH-01 | ✅ | payos/webhook | Chữ ký hợp lệ, code "00" | Đánh dấu PAID (idempotent) |
| API-WH-02 | ❌ | payos/webhook | Chữ ký giả mạo | 400, không đổi state |
| API-WH-03 | ❌ | payos/webhook | Sai số tiền (`total≠paidAmount`) | Không flip PAID |
| API-WH-04 | ❌ | payos/webhook | Webhook trùng lần 2 | No-op (`where UNPAID`), không gửi email lần 2 |
| API-WH-05 | ❌ | payos/webhook | PayOS chưa cấu hình | 503 |
| API-WH-06 | ❌ | payos/webhook | Lỗi xử lý nội bộ | Vẫn trả 200 (cron reconcile sau) |
| API-SRCH-01 | ✅ | search | `q` ≥2 ký tự | Kết quả FTS `unaccent` đúng |
| API-SRCH-02 | ❌ | search | `q` <2 / rỗng | Trả featured, không lỗi |
| API-SRCH-03 | ❌🔒 | search | Thử SQL injection trong `q` | Parameterized → an toàn |
| API-UP-01 | ✅ | upload | User đăng nhập, file ≤2MB, bucket whitelist | Upload OK |
| API-UP-02 | ❌🔒 | upload | Guest | 401 |
| API-UP-03 | ❌🔒 | upload | Non-admin upload ra path không sở hữu | 403 (path scoping) |
| API-UP-04 | ❌ | upload | File >2MB / sai bucket / thiếu file | 400 |
| API-CRON-01 | ✅ | cron/expire-payos | Bearer `CRON_SECRET` đúng | Hủy đơn UNPAID quá hạn + hoàn stock |
| API-CRON-02 | ❌🔒 | cron/expire-payos | Sai secret | 401 |
| API-CRON-03 | ❌🔒 | cron/expire-payos | **`CRON_SECRET` không set** | Endpoint MỞ — ghi nhận rủi ro, cần buộc set secret |
| API-EXP-01 | ✅ | admin/reports/export | Admin, type hợp lệ | Trả file .xlsx |
| API-OG-01 | ✅ | og | title/subtitle | Trả ảnh OG (cắt ≤120/≤160) |

---

## 5. PayOS — ma trận luồng thanh toán (GĐ2 trọng yếu)
| ID | Loại | Tình huống | Kỳ vọng |
|----|------|-----------|---------|
| PAY-01 | ✅ | Đặt PayOS → trả tiền → webhook PAID | Order PAID, paidAt, gửi email |
| PAY-02 | ❌ | Hủy thanh toán (cancelUrl) | Đơn giữ PENDING/UNPAID, cho trả lại sau |
| PAY-03 | ❌ | Webhook đến trước khi browser quay lại / ngược lại | Reconcile từ provider; không double |
| PAY-04 | ❌ | Đơn hết hạn (`paymentExpiresAt` mặc định 24h) | Cron hủy + hoàn stock; re-check tránh đua với webhook |
| PAY-05 | ❌ | Webhook đến đúng lúc cron đang quét hết hạn | Không double-cancel/double-pay (txn re-check) |
| PAY-06 | ❌ | COD | Không tạo link; order PENDING; admin xử lý tay |
| PAY-07 | ❌ | Tạo link PayOS lỗi | Rollback order + hoàn stock |
| PAY-08 | ❌🔒 | Giả mạo return params đánh PAID | Bị chặn (provider phải báo PAID) |

---

## 6. Validation boundary (Unit — Vitest)
Kiểm biên cho từng schema (`src/lib/validations/*`): rỗng/null, dưới min, trên max, sai format, sai enum, refine fail.
| Schema | Ca biên cần test |
|--------|------------------|
| auth | password 7 vs 8; email sai format; name 1 vs 2 vs 101; phone `^(0\|\+84)[0-9]{9}$` |
| address | recipientName 1; addressLine 4 vs 5 vs 256; thiếu province/district/ward code |
| order | items rỗng; quantity 0/âm/không nguyên; paymentMethod ngoài enum; note 501; voucherCode 31 ký tự |
| product | name 1; slug có ký tự hoa/space; basePrice 0/âm; comparePrice ≤ basePrice; ageRange rỗng; images 0/11; variant stock âm |
| voucher | code <3/>30/ký tự lạ; PERCENT discountValue 0/101; endsAt ≤ startsAt; usageLimit 0 |
| flash-sale | endsAt ≤ startsAt; items rỗng; salePrice ≤0 |
| banner | imageUrl không phải URL; title 1; sortOrder âm |
| review | rating 0/6/không nguyên; comment 9 vs 10 vs 2001; images >5 |
| return | reason 9 vs 10 vs 1001 |

---

## 7. Cross-cutting & điểm yếu nghi vấn (ưu tiên test)
| ID | Kịch bản | Kỳ vọng |
|----|----------|---------|
| X-01 | Giá tính lại server-side khi đặt (flash price đổi giữa cart↔checkout) | Dùng `effectiveUnitPrice` (min với flash), KHÔNG tin giá client |
| X-02 | Voucher PERCENT bị floor, cap bởi maxDiscount & subtotal | Số giảm đúng công thức `computeVoucherDiscount` |
| X-03 | **Total có thể ≤ 0** nếu FIXED voucher ≥ subtotal+ship | Kiểm có sàn total; nếu chưa → bug cần fix (`orders.ts:275`) |
| X-04 | usageLimit/perUserLimit voucher khi nhiều người dùng đồng thời | Tiêu thụ trong serializable txn, không vượt giới hạn |
| X-05 | `getOrderForAdmin` (unscoped) không bị gọi từ storefront | Verify không rò đơn người khác |
| X-06 | Rate-limit fails open + cron open (env thiếu) | Test cả 2 trạng thái env, buộc cấu hình ở prod |

---

## 8. UI / Responsive / SEO / A11y
| ID | Loại | Kịch bản | Kỳ vọng |
|----|------|----------|---------|
| UI-01 | 📱 | Mọi trang chính ở 375/768/1280px | Không tràn, tap target đủ lớn |
| UI-02 | 📱 | Skeleton/`loading.tsx` khi tải | Hiện skeleton, không nhảy layout (CLS thấp) |
| UI-03 | ❌ | Trang lỗi `error.tsx` / `not-found.tsx` | Hiển thị thân thiện, không lộ stack trace |
| UI-04 | ♿ | Keyboard nav, focus state, ARIA, contrast | Đạt cơ bản (dùng a11y-debugging) |
| SEO-01 | ✅ | Meta/OG/sitemap/robots/JSON-LD Product (GĐ2) | Đúng thẻ, sitemap có URL SP |

---

## 9. Tự động hóa — ánh xạ hiện trạng
- **Đã có**: `e2e/smoke-browse.spec.ts`, `smoke-checkout.spec.ts`, `smoke-admin.spec.ts`; unit cho ui/validation/server (flash-sales, banners).
- **Cần bổ sung (ưu tiên)**:
  1. E2E checkout COD + PayOS (mock provider) đầy đủ happy + cancel + expire.
  2. Integration `placeOrder`: stock race, voucher edge, total ≤ 0.
  3. Authorization matrix admin (USER → 404 mọi route) — script hóa.
  4. Webhook signature + idempotency + amount tampering.
  5. Validation boundary cho mọi schema ở §6.
- **CI**: đã có GitHub Actions + E2E gate (`23a9aca`); thêm các spec trên vào gate.

---

## 10. Thứ tự thực thi đề xuất
1. Smoke happy path GĐ1 (browse → cart → checkout COD → account) — đảm bảo không vỡ.
2. Negative path checkout/stock/voucher (rủi ro tiền bạc cao nhất).
3. PayOS matrix (GĐ2 thanh toán).
4. Authorization matrix admin + API.
5. Validation boundary (unit, nhanh, phủ rộng).
6. Responsive/SEO/A11y cuối cùng.
