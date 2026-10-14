# Kiểm tra lại chất lượng sau phản hồi của chủ repo

## Vì sao kết luận trước không đủ

Các check trước bảo vệ regression, nhưng ảnh điểm cuối và pixel đổi màu không
chứng minh chuyển động mượt hay chất lượng Gargantua. Chúng không chụp Contact
ở giữa câu, bỏ qua viewport 762×715 và không đo chi phí dựng từng frame.

Kiểm tra trực tiếp cổng 5182 thấy:

- Chữ/email Contact chồng lên khí sáng ở vị trí 5.88.
- Selector gallery chồng lên preview ở cửa sổ 762×715.
- Sau chuyển chương, CSS3D ẩn sản phẩm đầu khiến offsetWidth = 0. Camera lấy
  width fallback sai (1080 thay vì khoảng 1049), làm cả màn lệch lên/trái.
- Shader tính lại đường tia Kerr theo clock khí dù view không đổi. Capture ảnh
  tĩnh không phát hiện vấn đề cadence này.
- Vùng cuộn thiếu tabIndex tường minh; input End của bài kiểm tra mới không
  luôn đưa camera qua đoạn bay. Đã thêm focus cho region cuộn.

## Sửa

- Tách cache đường tia và shader plasma. Cache giữ ba giao điểm đĩa cùng
  capture/độ trễ; clock chỉ cập nhật plasma/bloom. Cache 2K/1K khi dừng, 768²
  khi kéo, phục hồi sau context loss. Gas/bloom giảm riêng resolution nếu
  cadence chậm, không giảm resolution của hình học đã cache.
- Prewarm shader trước Contact, tăng LOD theo kích thước chiếu. Khi bấm entry,
  giữ góc orbit và cache ray, dùng cadence theo thời gian thực để chuyển động
  camera không bị một lần dựng texture lớn chặn giữa chuyến bay.
- Dữ liệu timeout xác nhận target scroll đã tới Skills nhưng camera dừng ở
  frame đầu prewarm. Biên dịch ba chương trình nền từ lúc mở scene, thay noise
  hash nội tuyến bằng atlas RG nhỏ sinh tại chỗ. Giữ tia Kerr, đĩa và advection.
  Vật liệu cam đồng, eddy rộng giữ chi tiết tiền cảnh khi fine noise phải lọc.
- Lấy footprint từ derivative giao điểm để giữ chi tiết ảnh bị lens phóng đại,
  vẫn lọc minification/grazing/shear. Nền plasma dùng tọa độ Cartesian advect
  theo vận tốc Kerr; giảm cấu trúc vòng đồng tâm của vật liệu cũ.
- Chữ Contact ở trời trống; email và CV dưới đĩa. Không bỏ câu/link khỏi hành
  trình. Nút workspace và vùng kéo vẫn riêng.
- Mặt phẳng DOM tiếp tuyến chung cylinder, camera tại tâm. Đo computed width
  ngay cả khi mặt phẳng đầu bị ẩn; quan sát cả rail/card khi resize.
- Sắp xếp lại tablet/landscape, clip sân khấu dưới selector trong lúc xoay.
  Caption Outfit; giữ ảnh preview gốc, crop scrollbar lúc hiển thị. Live vẫn
  là iframe DOM tùy chọn, không biến chín preview thành website tự tải nền.

## Kiểm tra bổ sung

`check:ui` giữ các assertion cũ, thêm:

1. 762×715 và kiểm tra selector/preview tách nhau khi màn đã đến đúng vị trí.
2. Contact 5.88: bounds chữ/link nằm trong viewport, vùng nền của chúng không
   chứa plasma sáng; lưu ảnh trước khi chữ biến mất.
3. Phím End thật từ Skills, ghi mọi pose trong đoạn 5.30–5.82; không ép
   scrollTop riêng cho phép đo toàn đoạn. Mọi frame dịch chuyển cùng trục,
   nhìn về trước, không lùi.
4. Số lần trace không tăng khi view đứng yên, số lần shade tăng liên tục;
   đo cadence sau khởi động, reduced motion không tăng shade.
   Đo thêm realGasFps bằng clock Node quanh cửa sổ chuyển động, ngoài thời gian
   RPC chụp ảnh. Clock browser được điều khiển để chụp đúng frame chuyển cảnh;
   frameMs trong DOM dưới clock đó không đủ để khẳng định hiệu năng thời gian thực.
5. Các ảnh và thao tác orbit/reset/cancel, entry workspace, routes, chín
   sản phẩm, mười case study, hai CV và GLB gốc vẫn thuộc gate hiện có.
6. Report ghi hash source, không báo PASS nếu code đổi giữa lượt kiểm tra.
   Lỗi chờ câu ghi target/pause/focus/scroll/pose và ảnh trước khi đóng browser.

Ảnh kiểm tra trực tiếp hố đen: `output/playwright/blackhole-orbit-final-5182.png`.
Ảnh/report riêng của lượt audit nằm trong `artifacts/black-hole-audit/`;
`UI_OUTPUT` giữ output riêng khi các chat cùng kiểm tra. Output mặc định của
gate vẫn là `artifacts/feature-preservation/`.

## Kết quả cuối ngày 14/10/2026

Sau khi phối hợp giữ source ổn định giữa các chat intro, showcase và hố đen,
`pnpm run check` PASS. Lượt đầy đủ `check:ui` cuối PASS trên cùng fingerprint:
`d1effad35633761e1b5e32e1964cbe6470f01ba10ab1527ff6e8b306545d9981`.

Report dùng để chốt: `artifacts/solar-showcase-final-pass/report.json`,
status `passed`, đủ năm scenario. Các report thất bại trước đó là dữ liệu
chẩn đoán, không phải kết quả cuối.

| Cấu hình | Kết quả | Tốc độ cập nhật khí theo clock Node |
| --- | --- | --- |
| Desktop 1440×900 | PASS | 28,4 FPS |
| Tablet 762×715 | PASS | 31,1 FPS |
| Phone 390×844 mô phỏng | PASS | 24,0 FPS |
| Landscape 844×390 mô phỏng | PASS | 21,4 FPS |
| Reduced motion 1440×900 | PASS | Khí đóng băng, 0 pixel thay đổi |

Trong cả năm ảnh, số pixel khí sáng ngoài phạm vi kiểm tra bằng 0. Số lần
trace không tăng trong cửa sổ khí chuyển động khi view đứng yên. Đường bay,
orbit/reset/cancel, view được giữ khi entry, native iframe fixture, vòng đọc
180°, gallery thuận/ngược, routes và recovery đều nằm trong lượt PASS này.

Đã xem ảnh gallery, Contact, hố đen và các góc orbit; xem riêng landscape
Contact sau sửa specificity và reduced gallery sau sửa hệ tọa độ phẳng.
Sửa thêm từ các lỗi thật của gate: ba nút phone cùng một hàng, không đè dots;
câu Contact landscape không bị rule chung đẩy vượt mép phải. Các nút giữ
vùng chạm tối thiểu 44px.

Lượt cuối dùng server 5182 và `UI_OUTPUT=artifacts/solar-showcase-final-pass`.
Ảnh trực tiếp trong app: `output/playwright/blackhole-orbit-final-5182.png`.

## Giới hạn kết luận

PASS có nghĩa các hành vi được đo không hồi quy. Chất lượng vật liệu còn là
render WebGL nghệ thuật với đường tia Kerr, không phải bản render DNGR của
phim. Bộ lọc không gian không phải TAA. Fixture iframe chứng minh input DOM;
không chứng minh cả chín website bên ngoài cho phép nhúng. Xem ảnh và chuyển
động trực tiếp, không dùng số PASS để khẳng định hình ảnh đã đạt như phim.
