# Showcase trong mạch portfolio — 16/10/2026

## Phản hồi mới nhất: vân nước liquid cho cả hai hầm

1. Dùng ảnh xanh–cam của chủ repo làm gốc: mảng nước mềm, dòng đồng/cyan,
   vân phản sáng nhiều lớp; bỏ lưới và vân sợi cứng.
2. Dùng chung trường vật liệu mượt 128² cache. Intro chiếu vách bằng shader
   theo hình học cũ, có Canvas recovery; quay xoáy hữu hạn để không sinh
   vòng quá dày sau thời gian idle. Showcase dùng UV tuần hoàn, mép cổng mềm.
3. Giữ đường camera, nhịp cuộn, aperture thật, hai chiều, màn cong/live,
   URL từng thế giới và 360° riêng showcase. Nền hạ sáng khi đọc.
4. Chạy `check`, `check:ui`, bộ intro và showcase; xem ảnh mở cổng, trong
   hầm, đọc và chuyển trạm. Lưu bằng chứng riêng `artifacts/liquid-tunnels/`.

Kết quả: `check` PASS; intro và showcase PASS cả năm chế độ. Đã xem ảnh
desktop/tablet/phone/landscape/reduced và web Mèo Nổ thật, chuyển qua Study
Cabin rồi quay về. Giữ giới hạn: `check:ui` còn lỗi cursor baseline dòng 98,
chưa đo FPS/touch trên thiết bị thật. Report/ảnh mới trong `liquid-tunnels/`.

## Cổng lượng tử theo ảnh tham chiếu tiếp theo

1. Chín aperture đặt tại các ranh giới trạm URL, trên đúng đường camera.
   Thể tích khí torus, halo xoáy, sóng chạy dọc lòng hầm và hồ quang có nhánh
   dùng geometry/texture cache; không sửa intro trong ảnh tham chiếu.
2. Khi đi xuyên ranh giới, preview và caption nhường hẳn tầm nhìn, iframe
   tạm dọn. Màu hai không gian blend liên tục; mốc 01–09 cho biết đang ở đâu.
3. Cường độ passage theo vận tốc lẫn độ sâu. Dừng giữa trạm sẽ hồi preview,
   không buộc snap hoặc mắc kẹt trong cảnh năng lượng. Damping target 5,4,
   giữ nguyên inertia, đường lùi và camera ngoài showcase. Giữ 360° đã chốt.
4. Điện bám thành cổng, xung tròn chu kỳ 5,6s; không flash toàn màn hình.
   Reduced motion dùng bố cục phẳng; pause/cap 24/18 và một iframe như trước.
5. Kiểm tra aperture plane trước/sau camera, khoảng preview nhường chỗ,
   phục hồi và URL từng thế giới; cùng bộ hồi quy cũ. Bằng chứng mới lưu ở
   `artifacts/showcase-quantum-portals/`.

### Kết quả bản cổng lượng tử — 16/10

`pnpm run check` PASS. Bộ showcase PASS desktop, tablet, phone, landscape và
reduced; đã xem ảnh đọc/chuyển cổng. Trace kiểm tra hai phía mặt phẳng cổng,
preview/iframe nhường tầm nhìn và hồi live khi dừng ở độ sâu lẻ. Giữ native
click/input, CV/archive, URL/recovery, nhìn quanh/WASD/căn lại, hai chiều và
vòng 360° riêng showcase. Report đầy đủ `showcase-quantum-portals/report.json`,
tóm tắt `report-final.json`. Ảnh `*-portal-crossing.png` là frame giữa passage;
fixture web không hiện trong frame này vì preview đã nhường tầm nhìn.
Chỉnh cuối chỉ ẩn mốc không gian trên bố cục reduced; đã chạy lại reduced
PASS (`report-reduced.json`), bản tổng hợp giữ cả lượt năm chế độ và lượt này.

Đã xem qua lại Mèo Nổ/Study Cabin thật; ảnh đọc riêng `actual-boom-world.png`.
`pnpm run check:ui` còn dừng tại assertion con trỏ baseline dòng 98. Chưa đo
FPS/touch/âm thanh thiết bị thật; cap ambient không bảo đảm FPS mọi máy.

## Phản hồi tiếp theo: chi tiết sống và màn hình gắn với không gian

- Thành hầm: vân khí phân lớp, đường đồng mức, sợi xoắn có nhịp sáng trôi và
  bụi nhỏ. Màu theo sản phẩm, tương phản nền thấp để caption và web rõ.
- Ảnh gốc: 21 dải CSS3D nối liên tục trên cùng mặt trụ; hai mép tiến về phía
  người xem. Dùng lại đúng file gốc và crop scrollbar đã có, không tạo ảnh mới.
- Web live: một iframe native trong biên cong, không nhân iframe theo dải.
  Đây là silhouette cong; không tuyên bố nội dung DOM được uốn từng pixel.
  Bản tương tác đầy đủ vẫn phẳng, nhập liệu/hit-test native.
- Kết nối: rim cong và hai nhánh quang mỗi thế giới gắn vào thành ống, cùng
  camera/transform với cửa sổ. Giữ URL, controls và vòng quay 360° showcase.
- Ambient có clock riêng lúc đứng yên, cap 24/18 lần vẽ/giây; camera chuyển
  động dùng lượt vẽ đó để tránh vẽ trùng. Dừng khi ẩn tab/mở reader/rời gallery,
  không có dải ảnh/ống/ambient ở reduced motion. Chưa coi cap là số FPS đo được.
  Cache trường nhiễu 8 KiB trong DataTexture; shader lấy mẫu trường thay vì
  tính lại hash nhiều lần trên từng pixel. Dispose texture cùng renderer.

Kiểm tra mới lưu tại `artifacts/showcase-tunnel-detail/`. Giữ các báo cáo
`showcase-world-tunnel/` bên dưới làm bằng chứng phiên bản trước.

### Kết quả bản họa tiết cuối — 16/10

- `pnpm run check`: PASS, gồm dữ liệu/hợp đồng chuyển động, TypeScript và build.
- Bộ showcase: PASS desktop, tablet, phone, landscape và reduced. Xác nhận
  mặt trụ 21 dải, 18 nhánh nối, clock khi nghỉ/pause khi đọc, native click và
  nhập liệu, live/capture, CV/archive, URL/recovery, vào/ra hai chiều và 360°.
- `pnpm run check:ui`: đã chạy, dừng ở assertion con trỏ baseline dòng 98.
  Giữ assertion; không ghi bộ tổng PASS.

Đã xem ảnh năm chế độ; report đầy đủ `showcase-tunnel-detail/report.json`,
tóm tắt `report-final.json`. Website Mèo Nổ thật đã mở trong in-app browser,
ảnh riêng `actual-boom-live.png`; QA website ngoài dùng HTML fixture động.
Chưa đo FPS/kiểm tra touch và âm thanh trên thiết bị thật. Build vẫn cảnh báo
chunk trên 500 kB; cap ambient không phải cam kết FPS trên mọi máy.

## Phiên bản đường hầm ban đầu

Theo ảnh và mô tả tiếp theo: showcase là đường hầm lượng tử 3D, với chín
thế giới dọc chiều sâu và quanh thành ống. Mỗi `#/showcase/:id` tương ứng một
website thật. Màn hình là DOM/CSS3D nguyên vẹn, đặt nghiêng vào lòng ống;
ống, vòng sáng và khí màu dùng WebGL chung camera. Bỏ displacement/mask thử
nghiệm để ảnh và live web giữ rõ nét. Màu lấy từ sản phẩm, ánh sáng thưa.

Chỉ trong showcase: cuộn bay qua thế giới; kéo nhìn quanh; WASD di chuyển,
R/C lên xuống, Q/E nghiêng, F/nút căn lại phục hồi. Touch dọc di chuyển,
ngang nhìn quanh; Shift+kéo giữ lối cuộn cũ. Camera ngoài showcase giữ nguyên.
Group đường hầm xoay một vòng khi vào (1,8 giây) và ra (1,4 giây), easing
quintic nối vận tốc/gia tốc bằng 0; không thêm chuyển cảnh vào phần khác.

Live tự tải website đang chọn sau 420ms và không bắt thao tác kéo gallery.
Chuyển Ảnh/Live cho phép dùng capture gốc khi website chặn iframe; timeout có
thử lại. Chỉ một website preview chạy tại một thời điểm; ẩn tab/rời sản phẩm/
mở reader/trải nghiệm sẽ dọn iframe. Reduced motion dùng ảnh phẳng mặc định,
không xoay; người xem có thể chủ động chọn Live. Nút trải nghiệm đầy đủ giữ
iframe phẳng để chuột/phím không lệch vì phép biến dạng bề mặt.

Kiểm tra mới lưu trong `artifacts/showcase-world-tunnel/`: HTML fixture thay đổi
theo thời gian chứng minh live DOM; trace xác nhận 360° ở group và camera hành
trình vẫn thẳng. Kiểm tra nhìn quanh/di chuyển/căn lại, Ảnh/Live, dọn frame,
routing và bố cục năm chế độ.
Ảnh có chữ `fixture` chỉ dùng cho QA; không phải screenshot sản phẩm thật.

### Kết quả cuối của bản đường hầm — 16/10

| Kiểm tra | Kết quả |
| --- | --- |
| `pnpm run check` | PASS: dữ liệu, route, hợp đồng chuyển động, TypeScript và build |
| `node scripts/check-showcase-visibility.mjs http://127.0.0.1:5183/` | PASS cả desktop, tablet, phone, landscape và reduced |
| `pnpm run check:ui -- http://127.0.0.1:5183/` | Dừng ở assertion con trỏ baseline tại `scripts/check-ui.mjs:98` |

Báo cáo đầy đủ: `artifacts/showcase-world-tunnel/report.json`; tóm tắt:
`report-final.json`. Đã xem ảnh năm chế độ. Kiểm tra bao gồm live HTML cập nhật,
chỉ một iframe, chuyển capture/live, camera cục bộ/căn lại, link CV và archive,
URL trực tiếp, vào/ra hai chiều, vòng quay 360° và phục hồi URL sai/thiếu ảnh.
Canvas Three.js dùng inline `display: block`; CSS reduced motion phải ghi đè
để thật sự ẩn ống, đồng thời không gọi renderer WebGL trong chế độ này.

Đã mở BeatSync thật trong browser; ảnh riêng `actual-beatsync-world.png`.
Không coi fixture là bằng chứng mọi website hỗ trợ iframe. Chưa kiểm tra
touch/âm thanh vật lý hoặc đo FPS; build còn cảnh báo chunk trên 500 kB.

Các kết quả ở mục Kiểm chứng bên dưới thuộc phiên bản gallery trước đường hầm.

## Hướng triển khai

Showcase là phần tiếp theo của câu chuyện Porrima: tìm hiểu nhu cầu → nhìn
sản phẩm đã góp phần xây dựng → đọc cách làm ở Skills. Câu mời cuối dẫn vào
showcase tự động bằng cuộn; lùi đi lại cùng mạch. Ngoài showcase, giữ bay thẳng và orbit
cục bộ lúc đọc theo `straight-flight-contract.vi.md`.

1. Bật lại gallery cong, dùng cơ chế vào/ra hiện có và giữ chín địa chỉ gốc.
2. Đồng bộ nền sao tối, Outfit, viền mảnh, liên kết nhẹ; bỏ sàn phản chiếu và
   badge hướng dẫn nhấp nháy. Preview thật giữ tỉ lệ 16:9 và nội dung gốc.
3. Đối chiếu CV Full Stack và Software mới trong `public/file`: ghi rõ
   GameDressUp/Tung Tung là freelance đã bàn giao, BeatSync mở rộng từ nguồn
   mở, SentinelLAN và Backup là dự án cá nhân. Mỗi mục này có một câu đóng góp,
   một dòng công nghệ và link đến CV tương ứng. Không thêm số liệu thành tích.
4. Giữ lối đọc archive mười case study; kiểm tra route trực tiếp, mở/đóng
   CV và case study, thuận/ngược, bàn phím, mobile và reduced motion.

## Kiểm chứng

`pnpm run check` kiểm tra dữ liệu, routing, nội dung song ngữ, đường bay và build.
`pnpm run check:ui` là bộ hồi quy tổng; giữ các assertion baseline kể cả lỗi
con trỏ đã biết. `node scripts/check-showcase-visibility.mjs <URL>` kiểm tra
showcase đã bật, phạm vi đóng góp theo CV, bố cục và luồng vào/ra trên năm chế độ;
ảnh/report lưu ở `artifacts/showcase-upgrade/`.

Kết quả 16/10: `check` PASS. Showcase PASS cả năm chế độ; đã xem ảnh preview,
caption, công nghệ, selector và liên kết. `report-final.json` tổng hợp các
lượt và dẫn tới report gốc. Kiểm tra bao gồm mở/đóng CV và archive về đúng
sản phẩm, thuận/ngược, Home/End, Manager thiếu preview và phục hồi URL sai.
Nhánh gallery của `check:ui` tablet qua các kiểm tra bàn phím, live preview và
case-study trước khi dừng ở assertion cửa ra intro. Bộ tổng dừng sớm hơn tại
assertion con trỏ baseline. Hai lỗi này còn giữ nguyên, không ghi bộ tổng PASS.

Browser emulation không xác nhận touch/âm thanh trên thiết bị thật hoặc việc
website ngoài cho phép iframe. Cổng và thời lượng chuyển renderer dùng cơ chế
hiện có; thay đổi này tập trung vào cách dẫn chuyện, nội dung và diện mạo.
