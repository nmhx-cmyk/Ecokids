# Đồ án tốt nghiệp — Ecokids (LaTeX)

Báo cáo ĐATN dựng theo format ĐHBK Hà Nội (HUST), build bằng XeLaTeX.

## Build

```bash
./build.sh            # hoặc: latexmk -xelatex main.tex
```

Kết quả: `main.pdf`. Cần MacTeX/TeX Live (xelatex, latexmk).

## Cấu trúc

```
main.tex              # file gốc, gọi tất cả
preamble.tex          # định dạng (font, lề, caption, bảng...)
info.tex              # ★ THÔNG TIN CÁ NHÂN — sửa ở đây
frontmatter/          # bìa, cam kết, cảm ơn, tóm tắt, từ viết tắt
chapters/             # 6 chương nội dung
references.bib        # tài liệu tham khảo
figures/
  src/*.puml          # mã nguồn sơ đồ (PlantUML)
  diagrams/*.pdf      # sơ đồ đã render (use case, ER, kiến trúc...)
  screenshots/*.png   # ảnh chụp giao diện
  render-diagrams.sh  # render lại sơ đồ từ .puml
```

## ★ Việc cần làm (chỗ còn trống)

Tất cả chỗ chưa có hiển thị bằng chữ ĐỎ `[CHƯA CÓ — ...]` trong PDF, dễ tìm.

### 1. Điền thông tin cá nhân — sửa file `info.tex`
- Họ tên sinh viên, MSSV, email, số điện thoại, Lớp, Hệ đào tạo
- Giảng viên hướng dẫn (học vị + họ tên)
- Khoa/Trung tâm
- Tháng nộp (`submitMonth`)
- (Tùy chọn) thêm logo HUST: đặt `figures/hust-logo.png`

### 2. Ảnh giao diện
- Đã chụp sẵn (data demo, có thể thay sau): trang chủ, danh sách SP, chi tiết SP,
  đăng nhập, đăng ký, giỏ hàng.
- **Chưa chụp** (cần đăng nhập): `checkout.png`, `admin-orders.png`, `admin-reports.png`
  — hiện đang là khung placeholder. Chụp xong đặt vào `figures/screenshots/` đúng tên.
- Thay ảnh: chỉ cần ghi đè file PNG cùng tên trong `figures/screenshots/`, build lại.

### 3. Sửa sơ đồ (nếu cần)
Sửa file `.puml` trong `figures/src/` rồi chạy `figures/render-diagrams.sh`.

## Ghi chú nội dung

Nội dung kỹ thuật (use case, thiết kế CSDL, kiểm thử, giải pháp) được viết bám sát
mã nguồn thật của dự án Ecokids. Bối cảnh cửa hàng ở Chương 1–2 là giả định hợp lý,
có thể chỉnh cho khớp thực tế nếu cần.
