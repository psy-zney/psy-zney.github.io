# Bay thẳng, lọc Moiré và gallery CSS3D — 14/10/2026

Đây là mốc kiểm tra trước khi chủ repo phản hồi chất lượng chưa đạt. PASS dưới
đây chỉ xác nhận các regression đã viết lúc đó. Nó bỏ sót giao cắt chữ Contact,
kích thước cửa sổ 762×715 và cadence của shader; không dùng làm bằng chứng
đã hoàn thành toàn bộ yêu cầu hình ảnh. Xem `visual-audit-2026-10-14.vi.md`.

## Kết quả cuối

`pnpm run check` đạt: portfolio, experience, TypeScript và production build.
`pnpm run check:ui` đạt cả bốn cấu hình trong một lượt trên bản shader cuối:

| Cấu hình | Kết quả |
| --- | --- |
| Desktop 1440×900 | PASS |
| Phone 390×844 | PASS |
| Landscape 844×390 | PASS |
| Reduced motion 1440×900 | PASS |

Báo cáo máy: `artifacts/feature-preservation/report.json`. Đã xem ảnh gallery,
hố đen ở cả bốn cấu hình, ảnh tiếp cận từ xa và các ảnh đổi góc nhìn.
Ảnh Apps & tools: `output/playwright/css3d-gallery-apps.png`.

## Những hành vi được xác nhận

- Ba đoạn bay giữa các trạm giữ X=Y=0, Z tiến theo một chiều. Sau nửa vòng đọc,
  camera đổi hướng tại chỗ trước khi dịch chuyển. Camera nhìn đúng hướng bay;
  giữ nửa vòng 180° và khôi phục pose/câu khi cuộn ngược.
- Hố đen hiện từ xa trong đoạn Skills → Contact. Hai ảnh tại 5.42/5.68 có vùng
  sáng lớn dần và pose camera tiến về gate. Khi bấm vào workspace, pose từng
  frame giữ cùng trục và không lùi trước khi tiến.
- Hố đen desktop lớn thêm khoảng 26%, ray texture tối đa 2048²; mobile/medium
  1024², low 640². Lọc noise theo pixel hiển thị, góc đĩa và độ shear; mipmap
  HDR, anisotropy và các lớp cell chuyển tiếp mềm giảm vân nhỏ lặp lại.
- Giữ silhouette Kerr, vùng bóng tối không bị đĩa che, dải sáng tiền cảnh,
  tương phản trắng nóng/vùng tối, khí chuyển động trong vành đĩa. Reduced
  motion giữ khí đứng yên; kéo/reset/phím vẫn đổi phối cảnh thật trong shader.
- Nút workspace nằm dưới đĩa, kể cả khi nhìn từ dưới. Vignette mờ đi trong
  đoạn tiếp cận, giữ vùng trắng nóng trên điện thoại.
- Gallery dùng Scene/Group/Camera/CSS3DObject của Three.js. Các mặt phẳng DOM
  cùng nằm trên một hình trụ; renderer tạo ma trận camera, không chia ảnh thành
  các dải CSS. Giữ DOM khi đổi sản phẩm, wheel/drag/phím, các chương và return routes.
- Tiêu đề Outfit sans-serif. Các ảnh Sentinel/Security/Backup che 16px scrollbar
  khi hiển thị, giữ nguyên file ảnh. Gallery ẩn scrollbar của chính nó.
- Live iframe nằm trên mặt phẳng CSS3D; fixture xác nhận click, nhập chữ và
  wheel tới đúng DOM gốc. Đóng live preview khôi phục focus. Viewport iframe
  che thanh cuộn bằng chiều rộng bổ sung, không vô hiệu hóa scroll.
- Giữ chín địa chỉ sản phẩm, mười case study, hai CV, GLB và tương tác workspace.

## Điều chỉnh phép đo

Kiểm tra bóng lấy hai vùng đen liên thông ở cực thay vì tính cả nền trời đen
trong ô vuông quanh hố đen nhỏ trên điện thoại. Giữ các yêu cầu gần tròn,
diện tích bóng và độ tối. Kiểm tra crop dùng kích thước CSS có phần lẻ thay vì
`clientWidth` làm tròn; giữ yêu cầu cả ba preview được che scrollbar.

## Giới hạn thực tế

Vật liệu khí là procedural có advection, không phải GRMHD hay ray bundles
IMAX. Bộ lọc dùng không gian, không dùng TAA. Test trình duyệt mô phỏng touch
và dùng fixture cho iframe; không xác nhận touch/audio trên thiết bị thật hoặc
quyền nhúng của website bên ngoài. Vite vẫn cảnh báo một số bundle lớn; build
thành công và lượt UI cuối không có lỗi runtime/shader.
