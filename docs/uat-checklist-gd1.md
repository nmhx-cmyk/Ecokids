# UAT checklist — Ecokids GĐ1

Danh sách kiểm thử trước khi bàn giao GĐ1. Tick từng mục bằng `[x]`.

Quy ước: ✅ = pass, ❌ = fail (kèm note ở dưới hàng).

---

## A. Khách hàng — Account

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| A1 | Đăng ký bằng email/password mới | Tạo user, auto-login, redirect `/` | ⬜ |
| A2 | Đăng nhập bằng email/password | Vào trang chủ, header hiển thị tên | ⬜ |
| A3 | Đăng nhập bằng Google OAuth | Redirect Google → quay về `/`, profile được tạo | ⬜ |
| A4 | Quên mật khẩu — nhập email | Nhận email reset (Supabase default) | ⬜ |
| A5 | Logout từ menu user | Quay về `/`, header hiển thị "Đăng nhập" | ⬜ |

## B. Khách hàng — Browse

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| B1 | Mở `/` lần đầu | Hero + sản phẩm nổi bật load < 2s | ⬜ |
| B2 | Click vào danh mục từ header | Vào `/products?category=...`, list lọc đúng | ⬜ |
| B3 | Áp filter size + giá | Kết quả thu hẹp, URL update query param | ⬜ |
| B4 | Sort theo "Giá thấp đến cao" | Thứ tự đúng | ⬜ |
| B5 | Pagination — sang trang 2 | Load 24 sản phẩm tiếp, scroll giữ vị trí | ⬜ |

## C. Khách hàng — Search

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| C1 | Tìm "áo" (có dấu) | Trả kết quả khớp | ⬜ |
| C2 | Tìm "ao" (không dấu) | Trả cùng kết quả như C1 (nhờ `unaccent`) | ⬜ |
| C3 | Tìm "vay" → kết quả ≤ 500ms | Đo bằng Network tab | ⬜ |

## D. Khách hàng — Chi tiết sản phẩm

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| D1 | Mở chi tiết — chọn size 3T + màu Xanh | Giá + tồn kho cập nhật theo variant | ⬜ |
| D2 | Variant hết hàng → nút "Thêm vào giỏ" disabled | Nút mờ + label "Hết hàng" | ⬜ |
| D3 | Click "Thêm vào giỏ" | Toast confirm, badge giỏ +1 | ⬜ |

## E. Khách hàng — Giỏ hàng

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| E1 | Tăng/giảm số lượng | Tổng cập nhật realtime | ⬜ |
| E2 | Xoá item | Item biến mất, total tính lại | ⬜ |
| E3 | Reload trang | Giỏ vẫn còn (Zustand persist) | ⬜ |

## F. Khách hàng — Checkout

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| F1 | Checkout COD — điền đủ → submit | Tạo đơn, mã `ECO-2026-NNNNNN`, redirect thank-you | ⬜ |
| F2 | Checkout CK — điền đủ → submit | Tạo đơn + hiển thị info ngân hàng + nội dung CK | ⬜ |
| F3 | Bỏ trống số điện thoại → submit | Form báo lỗi inline, không submit | ⬜ |
| F4 | Tổng đơn ≥ 500k | Phí ship = 0 (miễn ship) | ⬜ |

## G. Khách hàng — Order management

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| G1 | Vào `/account/orders` xem chi tiết đơn | Hiển thị đủ items, total, status | ⬜ |
| G2 | Huỷ đơn ở trạng thái PENDING | Đổi sang CANCELLED, kho hoàn lại | ⬜ |
| G3 | Huỷ đơn ở trạng thái CONFIRMED | Nút huỷ disabled / không hiển thị | ⬜ |

## H. Khách hàng — Profile

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| H1 | Đổi tên trong `/account/profile` | Lưu, header update | ⬜ |
| H2 | Đổi mật khẩu | Yêu cầu pass cũ, lưu thành công | ⬜ |
| H3 | Thêm/sửa/xoá địa chỉ | CRUD ok, set default | ⬜ |

## I. Admin — Categories

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| I1 | Tạo danh mục mới | Lưu, hiển thị trong list | ⬜ |
| I2 | Sửa tên danh mục | Slug update? (theo policy giữ slug cũ) | ⬜ |
| I3 | Xoá danh mục có sản phẩm | Bị từ chối, hiển thị message | ⬜ |

## J. Admin — Products

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| J1 | Tạo sản phẩm đủ 4 section | Lưu, hiển thị trong list | ⬜ |
| J2 | Upload ảnh > 2MB | Bị reject với message rõ | ⬜ |
| J3 | Batch add 3 size × 2 màu | Sinh đúng 6 variant với SKU unique | ⬜ |
| J4 | Đổi trạng thái DRAFT → PUBLISHED | Sản phẩm xuất hiện ở storefront | ⬜ |

## K. Admin — Inventory

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| K1 | Inline edit `stockQty` | Lưu auto on blur | ⬜ |
| K2 | Filter "Sắp hết" | Chỉ hiển thị variant ≤ 5 | ⬜ |
| K3 | Xem log thay đổi tồn kho | Có entry MANUAL_ADJUST với userId | ⬜ |

## L. Admin — Orders

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| L1 | Filter đơn theo trạng thái | Kết quả đúng | ⬜ |
| L2 | Confirm đơn CK đã nhận tiền | PENDING → CONFIRMED | ⬜ |
| L3 | Đẩy workflow CONFIRMED → PACKING → SHIPPING → COMPLETED | Mỗi bước update đúng | ⬜ |
| L4 | Admin huỷ đơn PACKING | Cancel ok, kho hoàn, log lý do | ⬜ |

## M. Admin — Dashboard

| # | Bước | Kết quả mong đợi | Status |
|:--:|---|---|:--:|
| M1 | 4 card hiển thị số đúng | Cross-check với DB query | ⬜ |
| M2 | Mini chart 7 ngày | Hiển thị đủ cột, có data | ⬜ |

## N. Responsive

| # | Viewport | Kết quả | Status |
|:--:|---|---|:--:|
| N1 | Mobile 375px (iPhone SE) | Layout không vỡ, menu hamburger ok | ⬜ |
| N2 | Mobile 414px (iPhone Pro Max) | Layout ok | ⬜ |
| N3 | Tablet 768px | 2 cột grid sản phẩm | ⬜ |
| N4 | Desktop 1440px | 4 cột grid, header full | ⬜ |

## O. Performance & A11y

| # | Bước | Kết quả | Status |
|:--:|---|---|:--:|
| O1 | Lighthouse mobile `/` | Performance ≥ 85 | ⬜ |
| O2 | Lighthouse mobile `/products` | Performance ≥ 85 | ⬜ |
| O3 | Lighthouse mobile `/products/[slug]` | Performance ≥ 85 | ⬜ |
| O4 | Keyboard nav full flow (browse → add cart → checkout) | Không bị trap, focus ring rõ | ⬜ |

---

**Tổng:** 36 mục. Mục tiêu pass ≥ 34/36 trước launch.
