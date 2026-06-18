# Hướng dẫn quản trị — Ecokids

Tài liệu dành cho người vận hành cửa hàng (admin). Đọc từ trên xuống lần đầu, sau đó dùng như tham chiếu.

---

## Đăng nhập admin

1. Truy cập `https://<your-domain>/admin` (hoặc `/admin` trên localhost).
2. Đăng nhập bằng email và mật khẩu admin đã được seed (từ `SEED_ADMIN_EMAIL`).
3. Nếu thấy trang 404, tài khoản chưa có quyền ADMIN — liên hệ kỹ thuật để cập nhật `role` trong DB.

> Mẹo: dùng trình duyệt riêng (Chrome profile) cho admin để không lẫn với tài khoản khách thử.

---

## Quản lý danh mục

**Đường dẫn:** `/admin/categories`

### Tạo danh mục
1. Nhấn **"Tạo danh mục"**.
2. Nhập tên (ví dụ `"Bé trai"`) — slug tự sinh.
3. Chọn danh mục cha (để trống nếu là cấp 1).
4. Lưu.

### Sửa danh mục
- Click vào hàng → đổi tên / parent / thứ tự hiển thị → **Lưu**.

### Xoá danh mục
- Chỉ xoá được khi danh mục **không có sản phẩm nào**. Nếu còn sản phẩm, di chuyển sản phẩm sang danh mục khác trước.
- Khi xoá danh mục cha có danh mục con, các con sẽ tự động chuyển về cấp 1 (không bị xoá theo).

---

## Quản lý sản phẩm

**Đường dẫn:** `/admin/products`

### Tạo sản phẩm
Form chia làm 4 section:

#### 1. Thông tin
- Tên sản phẩm, slug (auto), mô tả ngắn, mô tả dài.
- Chọn danh mục (chỉ chọn danh mục cấp 2 nếu có).
- Trạng thái: `DRAFT` (chưa hiển thị) hoặc `PUBLISHED` (lên kệ).

#### 2. Giá
- Giá gốc (`price`).
- Giá khuyến mãi (`salePrice`, optional) — nếu nhập, FE tự gạch giá gốc và hiển thị salePrice.
- Giá lưu dạng **integer VND** (không nhập dấu phẩy, không số lẻ).

#### 3. Ảnh
- Kéo thả nhiều ảnh hoặc click chọn file.
- **Mỗi ảnh ≤ 2MB.** File lớn hơn sẽ bị reject — resize trước khi upload.
- Định dạng: JPG / PNG / WebP.
- Sắp xếp ảnh bằng kéo thả — ảnh đầu tiên là ảnh chính (hiển thị trên grid).

#### 4. Biến thể
- Mỗi sản phẩm có ít nhất 1 biến thể (Size × Màu).
- **SKU**: tự sinh theo công thức `<product-slug>-<size>-<color-slug>` hoặc nhập tay. SKU phải unique toàn DB.
- **Batch add**: chọn nhiều size + nhiều màu một lần → hệ thống sinh ma trận biến thể (ví dụ 3 size × 4 màu = 12 biến thể).
- Mỗi biến thể có `stockQty` ban đầu (default `0`).

---

## Tồn kho

**Đường dẫn:** `/admin/inventory`

- **Inline edit:** click vào ô `stockQty` để sửa nhanh. Lưu tự động khi blur.
- Mỗi lần đổi tồn kho, hệ thống ghi `InventoryLog` với `reason = 'MANUAL_ADJUST'` và ghi `userId` của admin.
- **Filter "Sắp hết"**: hiển thị biến thể có `stockQty <= 5`.
- Xem lịch sử thay đổi tồn kho của một biến thể bằng cách click icon "lịch sử" ở cuối hàng.

---

## Quản lý đơn hàng

**Đường dẫn:** `/admin/orders`

### Workflow trạng thái

```
PENDING → CONFIRMED → PACKING → SHIPPING → COMPLETED
                                     ↓
                                CANCELLED (có thể từ PENDING/CONFIRMED/PACKING)
```

| Trạng thái | Khi nào |
|---|---|
| `PENDING` | Đơn vừa tạo, chưa xác nhận thanh toán |
| `CONFIRMED` | Đã xác nhận (COD nhận đơn, hoặc CK đã thấy tiền) |
| `PACKING` | Đang đóng gói |
| `SHIPPING` | Đã giao shipper |
| `COMPLETED` | Khách đã nhận |
| `CANCELLED` | Huỷ |

### Xác nhận chuyển khoản
1. Kiểm tra sao kê ngân hàng — tìm nội dung khớp `<orderCode> <recipientName>`.
2. Vào chi tiết đơn → nhấn **"Xác nhận đã nhận tiền"**.
3. Trạng thái chuyển sang `CONFIRMED`. Khách nhận thông báo (nếu đã bật email).

### Huỷ đơn
- Từ trạng thái `PENDING`, `CONFIRMED`, hoặc `PACKING` đều huỷ được.
- Khi huỷ: hệ thống tự hoàn kho và log lý do.
- Nhập lý do huỷ (bắt buộc) — phục vụ thống kê.

---

## Dashboard

**Đường dẫn:** `/admin`

Hiển thị 4 con số chính:

| Card | Ý nghĩa |
|---|---|
| Đơn hôm nay | Số đơn được tạo trong ngày |
| Doanh thu tháng | Tổng đơn `COMPLETED` trong tháng hiện tại |
| Sản phẩm bán chạy | Top 5 SKU theo số lượng bán 30 ngày |
| Sắp hết hàng | Số biến thể có `stockQty <= 5` |

**Mini chart** hiển thị doanh thu 7 ngày gần nhất (cột ngày, trục dọc VND).

---

## Lưu ý vận hành

### Ảnh sản phẩm
- Resize về chiều rộng 1200px trước khi upload để tiết kiệm bandwidth.
- Đặt tên file rõ ràng (không dấu, không space) — hệ thống cũng tự normalize.

### Sequence năm mới
- Đầu tháng 1 hàng năm, kỹ thuật cần tạo sequence cho năm mới (ví dụ `order_code_seq_2027`). Xem `runbook.md`.
- Nếu quên, đơn đầu năm sẽ lỗi `relation does not exist`.

### Backup
- Supabase free tier tự backup hàng ngày, giữ 7 ngày.
- Khuyến nghị export thủ công bản DB hàng tháng và lưu offline. Xem `runbook.md`.
