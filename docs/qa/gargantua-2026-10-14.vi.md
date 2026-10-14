# Kiểm tra Gargantua — 14/10/2026

Đây là mốc trước các sửa đổi đường bay, lọc Moiré và gallery CSS3D. Kết quả
bản hiện tại nằm trong `black-hole-flow-css3d-2026-10-14.vi.md`.

`pnpm run check` đạt: portfolio, experience, TypeScript và production build.

Các kịch bản `check:ui` đều có lượt đạt trên cùng renderer cuối:

| Kịch bản | Kết quả | Bằng chứng |
| --- | --- | --- |
| Desktop 1440×900 | PASS | Log lượt gộp; ảnh `desktop-black-hole.png`, `desktop-black-hole-motion.png`, các ảnh orbit |
| Phone 390×844 | PASS | Lượt riêng, `report-phone.json` |
| Landscape 844×390 | PASS | Lượt `landscape,reduced`, `report-landscape-reduced.json` |
| Reduced 1440×900 | PASS | Lượt `landscape,reduced`, `report-landscape-reduced.json` |

Ảnh/JSON nằm trong `artifacts/feature-preservation/`. Đã xem ảnh cả bốn cấu
hình, cả góc nhìn dưới đĩa. Đĩa tiền cảnh, vùng bóng không bị che, tương phản
và khí chuyển động, phạm vi khí, kéo/cancel/reset/phím, mute và workspace đều
được kiểm tra trong các lượt đó. Hai ảnh ở reduced motion có số pixel khí
chuyển động bằng 0; ở phone và landscape số pixel khí sáng ngoài phạm vi là 0.

Các lượt gộp trước đó có timeout khi đọc body trong Chrome và một lỗi thời
điểm bắt đầu kéo gallery. Runner hiện chờ màn hình thực căn tâm trước khi kéo;
giữ nguyên assertion kéo phải đổi sản phẩm. Phép đo khí loại thanh tiến trình
giao diện ở mép dưới và dành hai pixel cho mép foreground được khử răng cưa;
bóng ở các cực vẫn phải tối. Không có một lượt gộp cuối đạt cả bốn kịch bản
liên tiếp; kết quả trên là từ các lượt đã đạt riêng.

Đoạn `output/playwright/gargantua-motion.webm` quay canvas bản cuối, VP9 với
bitrate mục tiêu 12 Mbps, có kiểm tra console không báo lỗi shader/WebGL.
Mô hình là WebGL tương tác với vật liệu khí procedural; xem giới hạn vật lý,
chất lượng và nguồn DNGR trong `docs/black-hole-rendering.vi.md`. Touch và âm
thanh trên phần cứng thật chưa được xác nhận bởi browser emulation.
