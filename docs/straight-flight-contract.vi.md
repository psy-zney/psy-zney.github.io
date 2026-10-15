# Chuyển cảnh đã chốt: luôn bay thẳng

Chủ repo chốt ngày 15/10/2026: **cảnh có thể nâng cấp, nhưng camera luôn
đâm thẳng, không tự xoay**. Không thiết kế lại cơ chế này khi sửa giao diện,
tối ưu FPS, đổi model hoặc thêm cảnh. Quy tắc này thay thế các yêu cầu cũ về
orbit camera 180°, bay vòng ngang và roll 10° lúc vào showcase.

## Bản tham chiếu

Video do chủ repo cung cấp:
`Virgo Portfolio _ Lê Quang Khánh — zney — Zen Browser 2026-10-15 17-42-22.mp4`.
Nguồn local: `C:/Users/admin/Videos/Captures/` (không bắt buộc tồn tại trên máy khác).
Đoạn khoảng 10–13s và 21–24s: vật thể nở ra và lướt qua theo chiều sâu;
camera tiếp tục nhìn phía trước, tới hệ sao tiếp theo rồi đọc từng câu.
Giữ chuyển động này; không tái tạo những lỗi chữ chồng nhau có trong video.

## Các bất biến

- Hành trình dùng một trục: X=0, Y=0, hướng nhìn cố định về -Z. Cuộn xuôi
  giảm Z; cuộn ngược tăng Z theo cùng đường và cùng hướng nhìn.
- Không orbit, yaw, pitch, roll, lắc, bẻ cua, quay đầu, hoặc giữ camera để
  reset hướng ở ranh giới giữa đọc và bay. Đoạn đọc cũng giữ hướng này để
  không cần quay lại trước khi đi tiếp. Vào showcase tiếp tục tiến qua lõi.
- Giữ lens cố định. Bố cục câu có thể đổi vị trí bằng phép chiếu liên tục;
  không dùng zoom thay cho chuyển động theo độ sâu.
- Vị trí theo cuộn, giữ giới hạn lead và khả năng hãm/lùi hiện có. Không thêm
  autoplay hoặc khóa chiều cuộn cho cảnh mới. Route trực tiếp vẫn snap đúng đích.
- Không thêm lớp xanh đục hoặc màn che để giấu cú đổi hướng. Giữ cổng vào,
  cửa ra thật và nền Home liên tục của intro.
- Khí cổng, sao, hành tinh, thiên thạch và đĩa hố đen được quay độc lập.
  Điều khiển xoay hố đen bằng tay, gallery hình trụ và workspace vẫn giữ;
  đây không phải quyền thêm chuyển động xoay tự động cho camera hành trình.

## Thay cảnh mà giữ đường bay

`straightFlightPose` trong `src/data/virgoTransit.ts` quyết định đường bay,
được `createFlightPaths` trong `VirgoScene.tsx` dùng trực tiếp. Cảnh nền nằm
trong `VirgoTransit.tsx` và không được sửa transform camera.

Hiện có trường thiên thạch, vệt sao băng và chớp siêu tân tinh cục bộ bên
cạnh hành lang. `createTransitScenarios` xáo ba cảnh một lần khi dựng hành
trình; ba đoạn bay chính dùng ba cảnh khác nhau. Không chọn ngẫu nhiên trong
render loop hoặc khi đổi chiều; lùi trên cùng đoạn phải thấy lại cảnh đã chọn.
Có thể bổ sung cảnh bay ngang hố đen hay hiện tượng khác vào danh sách này,
miễn giữ các bất biến trên và ngân sách chất lượng cho điện thoại/reduced motion.

## Kiểm tra trước khi bàn giao

- `pnpm run check`: đường thẳng, Z đơn điệu, lùi khớp đường cũ, lựa chọn cảnh,
  wiring với renderer và các tính năng portfolio còn lại.
- `node scripts/check-transit-ui.mjs http://127.0.0.1:5182/`: camera đang render
  trên desktop/phone, ba đoạn bay hai chiều, cả pose đọc, hướng cố định và cảnh
  không đổi khi lùi. Ảnh/report: `artifacts/transit-motion/`.
- `pnpm run check:ui`: hồi quy toàn trải nghiệm. Báo đúng lỗi và giới hạn nếu
  suite chưa xanh; không bỏ assertion ngoài phạm vi chỉ để PASS.
- Xem ảnh và chuyển động thực. PASS toán học không chứng minh chất lượng hình
  ảnh, FPS thật hay âm thanh/touch vật lý.

Chỉ thay đổi cốt lõi khi chủ repo yêu cầu rõ việc đổi đường bay/hướng camera.
Nâng cấp cảnh, màu, chi tiết hay hiệu năng tự nó không phải yêu cầu đó.
