# Ba CV hiện hành

Cập nhật ngày 22/10/2026 từ ba file chủ repo cung cấp:

| Tab | HTML | Bản gốc |
| --- | --- | --- |
| Backend | `public/file/Le_Quang_Khanh_CV_Backend_Developer.html` | `public/file/source/Le_Quang_Khanh_CV_Backend_Developer.docx` |
| Full Stack | `public/file/Le_Quang_Khanh_CV_Full_Stack_Developer.html` | `public/file/source/Le_Quang_Khanh_CV_Full_Stack_Developer.docx` |
| Software Engineer | `public/file/Le_Quang_Khanh_CV_Software_Engineer.html` | `public/file/source/Le_Quang_Khanh_CV_Software_Engineer.pdf` |

Năm HTML cũ được xóa theo yêu cầu. Route `web` và `game` cũ dùng Full Stack;
`mobile` cũ dùng Software Engineer. Các URL public/workspace/OS vẫn mở được.

## Nội dung và trình bày

Không viết lại nội dung CV. `scripts/convert-resumes.py` đọc paragraph/style
của DOCX và text PDF, xác nhận toàn bộ text sau chuyển đổi; mỗi CV có ba dự án
và sáu bullet. SHA-256 trong `public/file/source/manifest.json` đối chiếu các
bản gốc tải xuống. Script không sửa hoặc xóa file trong thư mục nguồn.

Mẫu `scripts/templates/resume.css` dùng A4, Times New Roman, lề 16/18mm,
heading 13,5pt có đường kẻ, tên 19pt, ngày căn phải và bullet như PDF mẫu.
Software giữ cả ngắt dòng phần Skills theo PDF. Desktop co vừa bản A4;
mobile reflow để đọc được, khi in vẫn dùng giấy A4.

Viewer dùng iframe `srcDoc` giữ nguyên head/CSS, không nhận typography của
website. Sandbox không cho chạy script. Nút In gọi tài liệu trong iframe;
trang web và thanh công cụ không đi vào bản in. Mục lục tìm heading trong
frame, Escape chuyển về cơ chế đóng dialog của website. Hủy fetch/observer/
listener khi chuyển tài liệu hoặc unmount; giữ Retry và liên kết mở trực tiếp.

Theo phản hồi cuối, toàn bộ vùng CV và thanh thao tác dùng nền trắng, chữ
mực đậm; chỉ vỏ popup ngoài giữ liquid glass. Điều khiển/mục lục có namespace
riêng để màu trắng và CSS CV không bị theme tối của website ghi đè.

## Tái tạo và kiểm tra

Dùng Python có `python-docx` và `pypdf`:

```text
python scripts/convert-resumes.py --source-dir public/file/source
```

Hoặc truyền thư mục Resume gốc; script bỏ qua copy nếu nguồn đã nằm đúng
vị trí tải xuống trong repo.

Kiểm tra static/build bằng `pnpm run check`; UI tổng bằng `pnpm run check:ui`.
`node scripts/check-resume-ui.mjs` kiểm ba CV ở năm chế độ, link tải, font,
layout, đích in, mục lục, Escape, alias cũ, HTTP lỗi/Retry và danh sách OS.
Ảnh và ba PDF in thử nằm tại `artifacts/cv-update/`.

Bản in thử từ Chromium là một trang A4 cho từng CV. Đã đối chiếu hình PDF
Software với nguồn, kiểm heading/lề/nội dung và xem ảnh desktop/mobile.
Không khẳng định trùng từng pixel giữa các bộ font/trình duyệt hoặc máy in thật.

Kiểm tra phiên bản cuối: `pnpm run check` PASS; UI riêng CV và popup PASS cả
năm chế độ; `pnpm run check:ui` với `UI_SCENARIOS=desktop` PASS luồng hồi quy
toàn trang. Không ghi bộ UI tổng đủ năm chế độ là PASS trên phiên bản cuối.
