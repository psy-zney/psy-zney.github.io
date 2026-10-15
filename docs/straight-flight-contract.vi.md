# Chuyển cảnh đã chốt: luôn bay thẳng

Chủ repo chốt ngày 15/10/2026: **chuyển trạm luôn đâm thẳng, không tự xoay**.
Phản hồi tiếp theo xác nhận: **vẫn xoay quanh sao lúc đọc**. Không xóa phần
xoay lúc đọc khi giữ đường bay thẳng, và không mang góc xoay vào đoạn bay.
Không thiết kế lại cơ chế này khi sửa giao diện, tối ưu FPS, đổi model hoặc
thêm cảnh. Quy tắc này thay yêu cầu bay vòng ngang và roll 10° lúc vào showcase.

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
- Đoạn đọc quay góc nhìn cục bộ đủ 180° theo cuộn, đảo chiều khớp cùng góc.
  `readingOrbitAngle`/`readingOrbitPoint` dùng phép quay nghịch của hệ sao
  quanh tâm, tương đương góc nhìn orbit nhưng camera hành trình vẫn giữ trục.
  Mesh và label phải cùng phép đổi tọa độ. Hệ sao rời đi giữ nguyên góc cuối,
  hệ sao đến bắt đầu ở góc đầu; không unwind hoặc reset trước chuyến bay.
- Trong chuyển trạm không yaw, pitch, roll, lắc, bẻ cua, quay đầu, hoặc giữ
  camera để reset hướng. Vào showcase tiếp tục tiến qua lõi.
- Giữ lens cố định. Bố cục câu có thể đổi vị trí bằng phép chiếu liên tục;
  không dùng zoom thay cho chuyển động theo độ sâu.
- Vị trí theo cuộn, giữ giới hạn lead và khả năng hãm/lùi hiện có. Không thêm
  autoplay hoặc khóa chiều cuộn cho cảnh mới. Route trực tiếp vẫn snap đúng đích.
- Đường Z phải có đạo hàm âm liên tục, khác 0 cả ở mốc đọc/bay. Không nối các
  smoothstep độc lập khiến mỗi mốc thành một khoảng cuộn gần như đứng yên.
  Contact kết thúc đúng giới hạn cuộn; đoạn cuối dùng track 160vh và pacing
  1,8s, không thêm đuôi cuộn trống sau hố đen.
- Reduced motion vẫn lấy đúng độ sâu từ cuộn ngay lập tức; bỏ orbit/ambient
  và animation chờ, không lượng tử hóa vị trí thành hai đầu chương.
- Không thêm lớp xanh đục hoặc màn che để giấu cú đổi hướng. Giữ cổng vào,
  cửa ra thật và nền Home liên tục của intro. Lòng hầm/cửa xa giữ đen kín khi
  đọc chữ; chỉ mở lộ Home khi cách cửa ra dưới 650 đơn vị. Không lộ sao ngay
  lúc vào hầm, không dừng camera chờ một màn chuyển cảnh theo timer.
- Chỗ tối cuối hầm là sương chiều sâu có mép mềm, không phải một đĩa đen
  phình lớn. Chữ bắt đầu ở thành trái rồi sang phải; hiệu ứng ink lấy từ
  độ sâu/cuộn và giữ nguyên vị trí chữ trên thành.
- Khí cổng, sao, hành tinh, thiên thạch và đĩa hố đen được quay độc lập.
  Điều khiển xoay hố đen bằng tay, gallery hình trụ và workspace vẫn giữ;
  đây không phải quyền thêm chuyển động xoay tự động cho camera hành trình.

## Thay cảnh mà giữ đường bay

`straightFlightPose` trong `src/data/virgoTransit.ts` quyết định đường bay,
được `createFlightPaths` trong `VirgoScene.tsx` dùng trực tiếp. Cảnh nền nằm
trong `VirgoTransit.tsx` và không được sửa transform camera.

Hiện có trường thiên thạch, vệt sao băng và bụi sao nhẹ bên
cạnh hành lang. `createTransitScenarios` xáo ba cảnh một lần khi dựng hành
trình; ba đoạn bay chính dùng ba cảnh khác nhau. Không chọn ngẫu nhiên trong
render loop hoặc khi đổi chiều; lùi trên cùng đoạn phải thấy lại cảnh đã chọn.
Có thể bổ sung cảnh bay ngang hố đen hay hiện tượng khác vào danh sách này,
miễn giữ các bất biến trên và ngân sách chất lượng cho điện thoại/reduced motion.
Sao băng dùng vài đốm sáng mềm; không khôi phục lớp vệt tốc độ quanh camera
hoặc các đuôi trắng lineSegments phủ lên cảnh. Cảm giác bay đến từ parallax
của vật thể/bụi và độ sâu camera, không cần thêm các nét trắng cứng.
Chủ repo đã yêu cầu bỏ vụ nổ: không khôi phục `VirgoSupernova`, ejecta,
chớp nổ ngẫu nhiên hoặc nhánh làm sao cuối tan sớm. Vindemiatrix giữ bề mặt
plasma xanh rõ khi đọc, mờ cùng hệ sao khi rời trạm; renderer hố đen giữ nguyên.
Đến Contact, các liên kết yên ở footer cho tới vị trí cuối, không biến mất theo câu dẫn.

## Kiểm tra trước khi bàn giao

- `pnpm run check`: đường thẳng, Z đơn điệu, lùi khớp đường cũ, lựa chọn cảnh,
  wiring với renderer và các tính năng portfolio còn lại.
- `node scripts/check-transit-ui.mjs http://127.0.0.1:5182/`: camera đang render
  trên desktop/phone, ba đoạn bay hai chiều, cả pose đọc, hướng cố định và cảnh
  không đổi khi lùi. Ảnh/report: `artifacts/transit-motion/`.
- `node scripts/check-scroll-ui.mjs http://127.0.0.1:5182/`: từng nhịp wheel
  nhỏ hai chiều, đổi chiều khi đang bay, orbit đọc thực, góc giữ khi rời trạm,
  giới hạn cuộn ở Contact trên desktop/phone/reduced motion.
- `pnpm run check:ui`: hồi quy toàn trải nghiệm. Báo đúng lỗi và giới hạn nếu
  suite chưa xanh; không bỏ assertion ngoài phạm vi chỉ để PASS.
- Xem ảnh và chuyển động thực. PASS toán học không chứng minh chất lượng hình
  ảnh, FPS thật hay âm thanh/touch vật lý.

Chỉ thay đổi cốt lõi khi chủ repo yêu cầu rõ việc đổi đường bay/hướng camera.
Nâng cấp cảnh, màu, chi tiết hay hiệu năng tự nó không phải yêu cầu đó.
