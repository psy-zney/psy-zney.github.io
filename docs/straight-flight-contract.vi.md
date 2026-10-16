# Chuyển cảnh đã chốt: luôn bay thẳng

17/10, hình mở mới: kính rạn và sét tồn tại trước, tan ở 1,20; sau đó cổng
mới hình thành. Vẫn hoàn tất trong một gesture, camera đứng yên đến 2,75.
Thay thứ tự nứt chồng lên rim cũ, không thay đường bay hoặc nhịp input.

17/10, thao tác mở mới: một gesture wheel tiến mở cổng đến 2,75 với nhịp
đã giới hạn. Camera vẫn đứng yên trong suốt đoạn nứt/mở; gesture tiếp theo
mới bay vào. Đuôi trackpad không tự đưa người xem qua cửa. Cho phép mở hết
sau một roll theo yêu cầu mới, thay chốt không tự hoàn thành mở trước đây.

Ngày 17/10: nhịp roll showcase có giới hạn đích, vận tốc và gia tốc theo
đơn vị thế giới; không cộng xung vận tốc qua mỗi wheel event. Intro giữ
độ nhạy/tốc độ nhất quán trước và sau cổng. Điều chỉnh này chỉ đổi nhịp
input, giữ đường Z, orbit đọc, quay lúc vào và không xoáy lúc thoát showcase.

Phản hồi tạo lỗ không gian tiếp theo 16/10: giữ camera đứng yên ở Z=1000
trong lúc năng lượng tụ, vết rách dọc mở thành cổng theo cuộn. Khẩu độ và
khí rim cùng biến dạng cục bộ; cổng căn ra phía trước trước khi bay. Chỉ sau
mốc intro 2,75 camera mới tiến theo đường Z đã chốt. Lùi phục hồi hình học
của vết rách, không quay camera hoặc thêm autoplay.

Phản hồi mở cổng tiếp theo 16/10: intro nhẹ cuộn hơn và tất cả lớp liquid
của cổng dùng chung nhịp. Vòng vào showcase còn 1,1s; tiến theo chiều sâu
và xoay dùng cùng easing. Đây vẫn là chuyển động group cục bộ, camera hành
trình giữ hướng thẳng; thoát showcase không xoay như chốt bên dưới.

Chốt mới nhất 16/10/2026: **bỏ xoáy khi thoát showcase**, cả chiều tiến/lùi.
Group màn hình và đường hầm không tự yaw/roll lúc ra; giữ rút theo chiều sâu.
Vòng 360° lúc vào và góc nhìn cục bộ trong showcase giữ nguyên. Yêu cầu này
thay riêng phần xoay lúc ra trong xác nhận cũ bên dưới.

Chủ repo chốt ngày 15/10/2026: **chuyển trạm luôn đâm thẳng, không tự xoay**.
Phản hồi tiếp theo xác nhận: **vẫn xoay quanh sao lúc đọc**. Không xóa phần
xoay lúc đọc khi giữ đường bay thẳng, và không mang góc xoay vào đoạn bay.
Không thiết kế lại cơ chế này khi sửa giao diện, tối ưu FPS, đổi model hoặc
thêm cảnh. Quy tắc này thay yêu cầu bay vòng ngang và roll 10° lúc vào showcase.

Xác nhận tiếp theo 16/10/2026: **chỉ vòng màn hình showcase xoay 360° và roll
nhẹ khi vào/ra; không áp dụng cho phần khác**. Transform thuộc group màn hình
trong `ShowcaseSpace`, camera hành trình vẫn nhìn thẳng. Bề mặt cong và website
live trong gallery không thay quyền xoay của camera, orbit đọc hay intro.

Yêu cầu đường hầm nhiều chiều tiếp theo cùng ngày cho phép **camera cục bộ
trong showcase** nhìn quanh, di chuyển XYZ và nghiêng theo thao tác người xem.
Các thế giới đi dọc một ống 3D, mỗi website giữ URL riêng. Quyền này chỉ áp dụng
`ShowcaseSpace`; không thay `CameraFlight` hoặc camera của các chuyến bay ngoài
gallery. Nút F/căn lại trả về bố cục đọc của thế giới hiện tại; reduced motion
giữ các mặt phẳng và đường cuộn đơn giản.

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
  cửa ra thật và nền Home liên tục của intro. Vách liquid luôn có ánh sáng;
  vân liquid nối tới điểm tụ và giữ nền opaque khi đọc chữ, mở lộ Home khi
  cách cửa ra dưới 650 đơn vị. Không xóa vách thành nền đen khi pause/đổi
  tab. Không lộ sao ngay lúc vào hầm, không dừng camera chờ một màn chuyển
  cảnh theo timer.
- Theo phản hồi tiếp theo 16/10, bỏ lớp haze/đĩa đen phủ lên cuối hầm; dùng
  chính vân liquid liên tục tới tâm. Chữ bắt đầu ở thành trái rồi sang phải;
  hiệu ứng ink lấy từ độ sâu/cuộn. Theo xác nhận 16/10, đầu câu gần người xem, cuối câu xa dần
  vào lòng hầm ở cả hai vách; từng từ giữ glyph đọc xuôi. Giữ tâm patch và
  thứ tự hai câu, không đổi đường camera để đảo chiều chữ.
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
