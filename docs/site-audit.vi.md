# Rà soát trải nghiệm website — 20–21/10/2026

Phạm vi: intro, Home, bốn trạm đọc, menu điều hướng, chín thế giới sản phẩm,
gallery 3D, liên hệ, CV/tài liệu, workspace và vòng đời âm thanh.

## Những điểm đã sửa

| Vấn đề quan sát được | Kết quả |
| --- | --- |
| Sau Start, Home chỉ có cảnh 3D và thiếu lối đi tiếp rõ ràng | Hướng dẫn ngắn cùng About/Projects; tự ẩn khi bắt đầu đọc |
| Menu bị ẩn trên desktop và thiếu lối vào workspace | Destinations dùng trên mọi kích thước; có workspace, Escape và bấm ra ngoài |
| Điều khiển bên dưới showcase vẫn xuất hiện với bàn phím/screen reader | Lớp bị phủ trở thành inert; nút âm thanh vẫn hiện trên bộ chọn Worlds |
| Preview trên phone quá nhỏ, sao nền thành vệt dọc | Mở rộng ảnh thật, giữ contain; tính bán kính sao theo pixel của từng trục |
| Đầu trang liên hệ không cuộn lên hết, còn lộ đuôi showcase | Contact cao tối thiểu một viewport |
| Deep link Contact dừng giữa fade và liên kết có thể inert | Đích Contact là vị trí 6, hoàn toàn hiện và tương tác được |
| Khung kính sát thanh điều hướng trên landscape | Giảm đệm khung và điều chỉnh vị trí cột mô tả |
| Nút Contents dịch khỏi con trỏ khi tablet chuyển từ touch sang mouse | Giữ cố định các nút HUD; màn nhỏ thu chữ thành icon và giữ accessible name |
| Âm nền portfolio tiếp tục khi chuyển sang workspace | Cách ly hoạt động hai view; phục hồi nền khi quay lại, giữ mute preference |
| Click trong live preview từng lệch/mất ở nhịp đầu | Dialog portal ra body, iframe native dùng viewport phẳng; có loading/ready sau paint, giữ mặt xem CSS3D và trả focus |
| Bloom còn nâng nhẹ màu vùng lõi tối của hố đen | Loại bỏ ánh bloom trên ray bị bắt giữ không phát xạ, giữ đĩa khí tiền cảnh |
| Góc hố đen reset ngay khi đổi route dù cảnh vẫn đang trượt | Giữ góc đã chọn hết 1,1 giây chuyển cảnh, chỉ reset khi bị che hoàn toàn |
| Nút dưới đĩa khí chỉ cách 8px khi nhìn từ dưới ở reduced motion | Điều chỉnh cap theo nút 44px và inset đáy 12px; lượt kiểm riêng đo khoảng cách 24px |
| Nút đóng che điểm chọn Zney Backup trên landscape | Pagination chừa khoảng riêng trước nút đóng, có cuộn khi màn hình hẹp |
| Story chồng Archive 20px trên 667×375 | Tách action bên trái và Archive/CV/reset bên phải, giữ đủ đích và vùng bấm |
| Vùng orbit chặn click email khi dùng chuột trong cửa sổ thấp | Đặt vùng kéo dưới lớp liên kết, vẫn kéo được lõi trống |

## Bằng chứng kiểm tra

- `scripts/check-site-audit-ui.mjs`: PASS trọn lượt desktop 1440×900,
  tablet 762×715, phone 390×844, compact 320×568, landscape 844×390 và reduced.
  Mỗi trường hợp đi qua Start, menu, bốn trạm, cả chín thế giới, Contact/CV;
  desktop/phone kiểm thêm nội dung workspace. Kiểm cả camera thẳng, ảnh contain,
  vùng chữ không chạm navigation, đóng menu và mute trên showcase. Cả sáu
  viewport đều qua ba lần click liên tiếp, nhập chữ và cuộn iframe live native.
  Report/ảnh: `artifacts/site-audit/report.json` và các file theo viewport.
- `scripts/check-audio-browser.html`: PASS với AudioContext/AnalyserNode thật,
  nền, 13 preset, typing, scroll, mute/unmute, cách ly workspace và phục hồi.
  Bằng chứng: `artifacts/site-audit/audio-check.jpg`.
- Test con trỏ được cập nhật theo CSS hệ thống trong working tree, không phục
  hồi hai PNG chủ repo đã xóa. Đo crop preview trên mặt đang hiển thị;
  gallery wheel phải dùng chuỗi packet và vùng ngoài iframe native.
- `pnpm run check`: PASS gồm portfolio, experience, universe, TypeScript và
  production build sau bản sửa cuối: modal/loading iframe, bloom, góc xuyên
  chuyển cảnh, inset nút, footer ngang hẹp và lớp tương tác Contact.
  Build còn cảnh báo chunk >500 kB.
- `pnpm run check:ui`: desktop/tablet/phone PASS trong lượt đầy đủ; lượt
  đó dừng ở lỗi nút đóng che Backup trên landscape. Sau sửa, chạy lại trọn
  landscape/reduced: PASS. Kiểm gallery/iframe, route recovery, cuộn thuận/
  ngược, camera thẳng, mute, silhouette/khí/cadence và chuyển cảnh.
  Bằng chứng: `artifacts/feature-preservation/report.json` (giữ lịch sử FAIL
  của lượt đầu) và `report-landscape-reduced.json` (hai kịch bản chạy lại PASS).
- Sau sửa lớp tương tác cuối, `UI_PHASE=black-hole pnpm run check:ui`:
  PASS cả năm viewport, gồm Contact, ảnh/motion/orbit và góc render giữ
  nguyên hết chuyển cảnh. `artifacts/feature-preservation/report-black-hole.json`.
- `scripts/check-contact-input-ui.mjs`: PASS 5 click link thật trên từng
  viewport desktop, phone và chuột 844×390; ngăn điều hướng trong test.
  Lõi vẫn kéo được ở hai chế độ chuột. `artifacts/contact-input/report.json`.
- `scripts/check-live-input-ui.mjs`: PASS 20 lượt mở/click đầu/nhập chữ/đóng,
  trả focus và gỡ iframe, không runtime errors. Giữ response để kiểm/chụp
  loading/ready thật; đã xem ảnh `artifacts/live-input/loading.png` và `ready.png`.
  Bản 667×375 kiểm thêm cả chín nút sản phẩm và không giao nhau giữa action/
  Archive/CV/reset; xem `gallery-controls.png` và `footer-controls.json`.
- Đo shader tách khỏi UI chữ/icon; khoảng cách nút và bounds UI vẫn kiểm
  riêng. Đĩa sáng được nhận dạng bằng thành phần liên thông lớn, không
  nhầm sao vàng trong GLB thành đĩa khí; phạm vi sáng chuẩn hóa theo từng
  trục của bóng Kerr. Cực tối dùng phần trong bao lồi,
  bỏ biên AA 2px, giữ các ngưỡng RGB, độ gần tròn và tỷ lệ tối 98,5%.
  Ảnh đối chiếu desktop có 30.367 pixel đo thay vì 5.739 pixel của mask
  tâm cũ. Thử chèn ô sáng 40×40: tỷ lệ cực trên còn 93,36%, bị ngưỡng loại.
- Báo cáo sáu kịch bản sau bản sửa cuối hoàn tất lúc `2026-10-20T17:47:37.072Z`, có coverage
  `journey + all worlds + native live iframe input`, fingerprint source và
  trạng thái chạy/fail/pass để phân biệt các phiên bản kiểm tra. Mỗi click
  chờ đúng kết quả DOM của nó, không gửi click thay thế khi sự kiện chậm.
  Touch gallery bắt đầu trên nền được hit-test, không giành gesture từ
  iframe native. Contact đo vùng bấm của đủ năm link, không tính ô trống footer.

## Những thứ được giữ

GLB gốc và bản sky dẫn xuất; tám preview thật; chín URL sản phẩm; mười case
study; CV HTML; đường bay thẳng và orbit đọc; gallery CSS3D, live iframe,
workspace, Zney OS, tài liệu, trạng thái lỗi và đường quay lại.
Không thêm tài nguyên tải từ ngoài, dependency hoặc nội dung dự án giả.

## Giới hạn

Kiểm tra trình duyệt mô phỏng không chứng minh cảm giác nghe qua thiết bị,
thao tác touch/sensor thật hay FPS trên điện thoại. Bundle chính vẫn lớn hơn
500 kB; không thay engine hoặc asset gốc để chỉ làm mất cảnh báo.
Lượt mở rộng `667×375` chưa PASS trọn phần ảnh: assertion pixel ấm ngoài
vành khí vẫn FAIL (72/6.184 pixel, khoảng 1,16%, ngưỡng 0,5%). Giữ nguyên
assertion, lưu ở `artifacts/gallery-small-landscape/report-landscape-black-hole.json`
và `landscape-gas-metrics.json`. Silhouette nhỏ 36×39 cùng nền GLB có sao
màu ấm cần đối chiếu thêm; chưa kết luận nguyên nhân hoặc ghi PASS.
Các nút/gallery/modal 667×375 đã qua kiểm riêng; không suy ra toàn bộ ảnh
ở viewport này đạt từ kết quả tương tác.
Video gốc của hầm intro vẫn chưa có nguồn hợp lệ, nên Start tiếp tục đi
thẳng tới Home theo baseline. Thay đổi nằm trong working tree local.
Chrome headless đã chạy được sau khi được phê duyệt lại. Iframe trong các
kiểm tra tự động dùng fixture local; khả năng nhúng website bên ngoài còn
phụ thuộc header/quyền cho phép của từng đích.
