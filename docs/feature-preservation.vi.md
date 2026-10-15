# Các tính năng cần giữ khi đổi model

Cập nhật ngày 15/10/2026. Đây là baseline của bản build hiện tại, áp dụng cho
Codex, Gemini và model khác. Các thay đổi đang nằm trong working tree cũng là
công việc của chủ repo; không quay về bản Git cũ để làm check chạy qua.

## Những gì cần giữ

| Luồng | Hành vi cần giữ | Kiểm tra |
| --- | --- | --- |
| Mở trang | Bộ tải dạng sóng, tiến trình dễ đọc; reduced motion bỏ thời gian chờ; dọn timer/listener khi rời trang | `check:experience`, `check:ui` |
| Cổng vòng xoáy và hầm lưới (15/10/2026) | Chòm sao nối từ tâm giữ nguyên vị trí. Cuộn mở xoáy khí xanh với lõi đen ngay tại sao vàng; hết giai đoạn mở mới cuộn tiếp để vào hầm. Tiến độ 0–7,8 là tọa độ cuộn, không phải tự phát theo giây. Dừng cuộn thì dừng tiến, cuộn ngược lùi cùng đường. Lưới 18 vòng/20 đường dọc có các dải khí xoắn trên thành. Hai câu mỗi câu một dòng, cố định trên mặt trụ, luôn chiếu từ xa theo khoảng cách; không fade vào theo timer. Chữ, khí và lưới dùng cùng phép chiếu; cắt qua cửa cổng. Giữ wheel/touch/phím/chạm, mute, reduced motion, hủy route và dừng tab ẩn; Home chỉ trở về hầm khi có cuộn ngược có chủ ý; không tự chạy lùi. | Kiểm tra hình học và điều khiển trong check:experience; ảnh vòng xoáy, vào hầm, chữ từ xa, dừng cuộn và đến Home trên 5 viewport trong check-intro-ui.mjs |
| Hành trình Virgo | Hiện từng câu theo scroll; camera đi nửa vòng tròn 180° quanh mô hình, giữ bán kính, hai câu Porrima ở đầu/cuối nửa vòng; chữ đổi góc trên/trái sang dưới/phải; cuộn ngược khôi phục góc/câu trước | `check:portfolio`, `check:experience`, pose/câu thực trong `check:ui` |
| Phòng chiếu cong | Scene Three.js + CSS3DRenderer với 9 mặt phẳng DOM trên cùng một hình trụ, camera chung; không chia ảnh thành dải CSS gây méo. Tiêu đề Outfit sans-serif; ẩn scrollbar của gallery. Ba preview Sentinel/Security/Backup giữ file gốc và chỉ cắt 16px mép phải chứa scrollbar khi hiển thị. Preview lớn, không có nút X thoát; tự mở sau câu cuối Porrima bằng wheel/touch; Trải nghiệm web → Ứng dụng & công cụ nối bằng ánh sáng; cuộn qua cuối gallery tiếp tục Skills, cuộn ngược trở lại Porrima; link trực tiếp vẫn hoạt động | `check:experience`, pose/matrix CSS3D, font, kích thước/ảnh/luồng thuận/ngược `check:ui` |
| Bay giữa các trạm | Giữ nửa vòng đọc 180°; các hệ sao lệch ngang, sau câu cuối bay vòng qua bên cạnh với độ lệch x/y liên tục và tiến về Z âm, không giữ camera rồi giật đổi 180°. Bỏ lớp phủ xanh đục; khung hình chuyển lệch trái/phải bằng nội suy liên tục qua toàn đoạn bay. Cuộn ngược đi lại cùng đường. Tốc độ đọc/bay nối qua vùng giảm/tăng tốc liên tục, không nhảy giữa các rate hằng. URL về Home/Cosmos nhảy trực tiếp, đồng bộ tọa độ và target ngay cùng frame. Hố đen xuất hiện từ xa trong đoạn Skills → Contact; bấm vào workspace tiếp tục cùng trục | Lấy mẫu ba transit theo hai bán kính, kiểm tra heading liên tục, cùng chiều xoay và không giữ vị trí để reset trong `check:experience`; pose/ảnh ở 5.42 và 5.68, pose liên tục khi vào workspace trong `check:ui`; URL và đi ngược trong `check-intro-ui.mjs` |
| Điều khiển gallery | Wheel ngang/dọc, kéo ngang/dọc, giữ quán tính; phím mũi tên, Home/End; đổi sản phẩm không remount gallery | `check:experience`, `check:ui` |
| Vào/ra showcase | Theo yêu cầu core dive ngày 14/10: câu “Each project…” bên phải trước, “Here is how…” bên trái sau; vẫn đọc theo orbit 180° và cuộn ngược. Entry 4s: chuẩn bị 1.5s, quỹ đạo tăng tới 4×, camera roll 10° lao xuyên lõi trong 1.1s, flash vàng trắng 0.2s qua điểm nối renderer. Bỏ hoàn toàn khung chữ nhật chuyển cảnh. Sau 2.6s mới đổi hash/mount gallery; CSS3D nâng cụm từ y=-300, tilt=.4 rad lên y=0/tilt=0 và camera giảm tốc expo.out đáp z=-2500. Tab và caption/dots/actions hiện ở 3.4–4s; điều khiển mở sau đáp. Ra gallery dùng ánh sáng rồi nối lại cảnh model; reduced motion chuyển ngay, đổi route hủy passage cũ | `check:ui` đo hash/DOM/camera, flash, tốc độ orbit, roll và pose cylinder; xem ảnh trước/trong/sau entry |
| Con trỏ | Cặp ảnh gốc Deep Space Gradient lưu local: mũi tên khi di chuyển, bàn tay trên link/nút; giữ I-beam trong ô nhập và pointer lock workspace | `check:experience`, cursor CSS thực trong browser |
| Hành động sản phẩm | Link website và “Khám phá ứng dụng” đúng địa chỉ giới thiệu/tải; live preview tùy chọn dùng iframe DOM trên mặt phẳng CSS3D, giữ click/nhập phím/wheel gốc; che thanh cuộn của iframe bằng viewport mở rộng 16px, không chặn cuộn. Mở case study rồi đóng trở về đúng sản phẩm | `check:experience`, click/nhập/cuộn iframe fixture và return routes trong `check:ui` |
| Trạng thái lỗi | Không có cụm icon/tên/placeholder giữa màn hình Manager theo yêu cầu mới; trạng thái thiếu ảnh dành cho screen reader, tên và link nằm dưới màn hình; ảnh lỗi vẫn giữ link; hash sai có nút phục hồi | `check:experience`, `check:ui` |
| Contact → workspace | Theo ảnh Gargantua của chủ repo ngày 14/10: tia sáng Kerr quanh hố đen quay, đĩa tiền cảnh cắt ngang bóng hố đen; không tô hình tròn đen lên đĩa. Giữ bóng tối gần tròn ở hai phần không bị che, ảnh đĩa phía sau uốn trên/dưới, vân khí nhiễu động advect theo vận tốc góc Kepler (`woundAge + logR * 2.4`) mượt mà không lộ đốm rỗ tĩnh. HDR, ba lớp bloom cố định [192, 96, 48] và ánh sáng trắng nóng → vàng đồng; luồng khí chỉ thuộc mặt phẳng đĩa, slant optical depth và 5-tap shadow mask chống rỗng khe viền; rayResolution = resolution triệt tiêu block 2×2. Gate căn giữa desktop, nút nằm dưới đĩa và mở workspace hiện có; reduced motion đóng băng khí | Silhouette Kerr và vùng bóng không bị che; ánh sáng đĩa tiền cảnh trong bóng; hai ảnh kiểm tra khí chuyển động, tương phản, phạm vi và đồng bộ độ phân giải ray/shade; ảnh desktop/phone/landscape/reduced, khoảng cách nút và luồng `check:ui` |
| Xoay hố đen bằng chuột | Kéo trên hố đen để xoay quanh đĩa và đổi độ cao góc nhìn; thả giữ góc, nhấp đúp/Home đặt lại; mũi tên đổi góc. Pointer capture giữ thao tác khi kéo ra ngoài vùng và dọn sạch khi hủy; kéo không mở workspace. Nút vào workspace là vùng bấm riêng. Reduced motion đổi góc ngay theo tay; touch vẫn cuộn hành trình | Góc thực trong shader và ảnh đổi phối cảnh, kéo/thả ngoài vùng, pointercancel, nhấp đúp, phím và nút vào workspace trong `check:ui` |
| Âm thanh | Nhạc intro, nút mute; không làm hỏng vòng đời âm thanh workspace/journey đang được kiểm tra | `check:experience`, nút mute trong `check:ui` |
| Workspace cũ | GLB gốc, các tier tối ưu, GIF màn hình, di chuyển, documents, OS, bàn phím và CV | `check:portfolio`, `check:experience` |

Giữ đủ 9 địa chỉ trong `src/data/productShowcase.ts`, 10 case study trong
`src/data/portfolio.ts`, 8 preview thật trong `public/img/products/` và năm
bản CV HTML (`Le_Quang_Khanh_CV_{Backend,FullStack,Game,Software,Mobile}.html`).
Download mở trang tải do chủ repo cung cấp. Không tự tải installer.

Theo yêu cầu ngày 15/10, bỏ nút và dòng “Scroll or tap to begin”; chạm vùng
intro và phím tiến một bước; cuộn và vuốt điều khiển trực tiếp tiến độ.

Sửa chuyển trạm ngày 15/10: bỏ `virgo-transit-veil`, không đổi heading bằng
bước nhảy π → 0 và không giữ vị trí 20% đầu đoạn để reset. Hướng nhìn tiếp
tục cùng chiều xoay trong lúc di chuyển; vị trí khung hình khớp câu cuối và
câu đầu của hai trạm. `node scripts/check-transit-ui.mjs http://127.0.0.1:5182/`
đo quaternion/vị trí/phép chiếu của camera thực trên desktop 1242×715 và phone,
kiểm tra cả ba đoạn bay và lưu ảnh trong `artifacts/transit-motion/`.

Intro nối sao bắt đầu từ sao vàng trung tâm (index 1), lan đồng thời qua
năm nhánh rồi nối đủ 14 sao và 16 cạnh trong 4,9 giây sau loader. Camera
đứng yên trong lúc nối; thao tác bắt đầu sớm được chờ đến khi nối xong.
Nét nối Canvas rộng 0,45px, alpha 0,34; giữ nguyên bố cục chòm sao.
Chiều về giữ chòm sao đã nối xong. Kiểm tra điểm xuất phát, phân nhánh và
ảnh `*-constellation-*.png` bằng `check:portfolio` và `check-intro-ui.mjs`.

Cập nhật theo phản hồi mới nhất ngày 15/10: cuộn ngược có chủ ý tại Home
(tích lũy ít nhất 80px trong 350ms) quay lại đúng hầm mới từ điểm đến 7,8;
tiến độ vẫn bám delta cuộn và dừng khi ngừng cuộn, không tự tua ngược.
Một cú nảy 10px không mở cổng. Có thể lùi hết về chòm sao rồi đi xuôi lại.
URL trống, #/ và #/cosmos đều mở đúng intro mới khi reload. Đã gỡ component
VirgoIntroFracture và bộ render/audio fracture cũ khỏi scene; không mount
ba câu intro đen cũ hoặc câu dẫn ở hố đen. Cảnh hố đen chỉ còn nút biểu tượng
vào workspace, có aria-label; không có dòng hướng dẫn kéo chuột. Hố đen
được tăng scale desktop .78 → .87 và phone .62 → .67, giữ điều khiển xoay.
Hai hệ sao giữa lệch x=-90/+85; đường bay có độ lệch ngang và đứng, cách
mọi lõi sao tối thiểu 45 đơn vị. Giữ quỹ đạo đọc nửa vòng 180°, lùi đi cùng
đường và không có lớp che đục. Wheel tiếp tục dùng delta thật với lead
0,16 viewport, mỗi sự kiện tối đa 0,12 viewport, bỏ hàng đợi cũ khi đổi chiều.
Gallery bắt đầu sau câu cuối. Các kiểm tra tương ứng nằm trong
check-intro-ui.mjs, check-transit-ui.mjs và check-black-hole-ui.mjs.

Phần `virgoExperienceMotion.ts` có thể chứa thử nghiệm chưa gắn vào UI. Check
toán học hay sự tồn tại của file không có nghĩa tính năng đã hoạt động trên
trình duyệt. Xác nhận component còn được gắn trong ứng dụng và thử luồng thật.

### Bổ sung sau kiểm tra trực tiếp cổng 5182

- Khí thay đổi màu/mật độ mỗi frame nhưng đường tia Kerr được cache khi góc
  nhìn đứng yên. Không tích phân lại 480 bước chỉ vì clock khí đổi. Đổi góc dùng
  768² trong lúc kéo, trả về độ phân giải đầy đủ khi thả/ổn định; context restore
  phải dựng lại cache. Giữ ba giao điểm đĩa đầu tiên và độ trễ của từng tia.
  Prewarm trước Contact, chọn LOD theo kích thước chiếu. Entry giữ góc đã chọn
  và cache ray ổn định; không reset view hoặc đổi resolution giữa chuyến bay.
  Biên dịch nền từ lúc mở scene; atlas noise nhỏ giảm chi phí compile lần đầu.
- Chữ Contact nằm ở vùng trời trống, email/CV ở dưới đĩa trong lúc đọc câu cuối.
  Chụp cả vị trí 5.88, không chỉ điểm cuối 6. Vùng cuộn nhận focus và End thực
  sự dẫn qua đoạn bay Skills → Contact; mọi frame dịch chuyển đều nhìn về trước.
- Gallery dùng các mặt phẳng tiếp tuyến của một hình trụ, camera ở tâm, khoảng
  hở nhỏ đều giữa các màn. Resize camera theo cả rail và kích thước màn DOM.
  Selector phải ở ngoài preview chính, gồm cửa sổ 762×715. Landscape đặt caption
  cạnh màn và pagination phía trên để dành chiều cao cho preview.
- `check:ui` thêm 762×715, đo cadence và số lần shade/trace, kiểm tra giao cắt
  chữ/đĩa và ghi pose toàn bộ đoạn bay từ thao tác phím thật. PASS của check
  regression không đồng nghĩa đạt chất lượng hình ảnh như phim; vẫn xem hình
  và thử chuyển động trực tiếp trước khi kết luận.
  Report lưu hash source và chỉ PASS nếu source không đổi trong cả lượt chạy;
  lỗi chờ câu lưu scroll, target, trạng thái pause/focus, pose và screenshot.
  Cửa sổ motion đo realGasFps bằng clock Node; không suy ra hiệu năng thật chỉ
  từ frameMs khi clock browser đang được điều khiển để chụp chuyển cảnh.

## Lệnh kiểm tra

Core dive dùng tâm Porrima của hành trình làm gốc cục bộ (world z=-480).
Giữ trạm và orbit đọc hiện có; lúc flash, CSS3D dùng không gian showcase riêng
với tâm vòng trụ/camera ở (0,0,-2500). Bán kính trụ theo viewport để giữ nguyên
kích thước preview. Hai renderer nối bằng flash #FFF8E7; sao #F4A261,
quầng chuyển cảnh #E76F51 và nền gallery #05050A. Preview vẫn là file thật của
chủ repo, không tải hoặc tạo ảnh thay thế.

```sh
pnpm install
pnpm run check
pnpm exec playwright install chromium
pnpm run check:ui
```

`check` chạy portfolio, experience rồi TypeScript/production build.
`check:experience` gọi `scripts/check-current-features.mjs`, nên lệnh cũ của
Gemini tự kiểm tra thêm các tính năng mới. Pipeline deploy chạy hai bộ kiểm tra
trước khi build/upload; regression không được xuất bản qua pipeline này.

`check:ui` tự chạy Vite trên localhost:5181 rồi đóng sau khi xong. Có thể truyền
URL của server đang chạy: `pnpm run check:ui -- http://127.0.0.1:5180/`.
Kiểm tra riêng các mốc intro trên server đang chạy:
`node scripts/check-intro-ui.mjs http://127.0.0.1:5180/`. Script dùng clock trình
duyệt có kiểm soát để ảnh không bỏ qua giai đoạn; ảnh nằm trong
`artifacts/intro-flight/`. Clock này xác nhận timeline, không đo cadence thực.
Đo cadence riêng, không dùng clock giả:
`node scripts/check-flight-performance.mjs http://127.0.0.1:5180/`.
Số liệu nằm trong `artifacts/intro-flight/performance.json`; phụ thuộc máy và
tần số màn hình, không suy ra đã đạt 120 FPS từ check toán học 120 Hz.
Nếu dùng Chrome đã cài trên Windows:

```powershell
$env:UI_CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
pnpm run check:ui
```

Kiểm tra trình duyệt ở 1440×900, 762×715, 390×844, 844×390 và reduced motion. Ảnh và báo
cáo JSON nằm trong `artifacts/feature-preservation/`. Mỗi lần sửa giao diện,
xem ảnh riêng: preview không bị cắt; chữ, selector và nút không chồng nhau;
vùng bấm ít nhất 44px; hố đen vẫn hiện và đi vào workspace được.

Browser check mô phỏng input và dùng fixture cho live iframe. Nó không xác
nhận cảm giác âm thanh, touch trên thiết bị thật hoặc việc website bên ngoài
cho phép nhúng iframe. Khách luôn có link mở website ở tab riêng.

## Khi thêm hoặc đổi tính năng

1. Đọc baseline và chạy check trước khi sửa; giữ nguyên công việc chưa commit.
2. Sửa tính năng, thêm tình huống kiểm tra theo hành vi người dùng. Kiểm tra cả
   đi thuận/ngược, URL trực tiếp, Back/đóng dialog, reduced motion và lỗi asset.
3. Cập nhật bảng trên cùng check liên quan nếu chủ repo thay đổi yêu cầu.
4. Chạy check/build và browser check phù hợp; báo rõ phần chưa kiểm tra được.

Check ngăn những regression đã được mô tả; không bảo đảm mọi thay đổi tương
lai. Đừng xóa các check mới hoặc bỏ qua lệnh kiểm tra khi đổi model.

### Giới hạn kiểm chứng ngày 15/10/2026

`check` và intro trên 5 viewport đã PASS với bản vòng xoáy điều khiển bằng
cuộn, chữ một dòng có sẵn trên thành và Home trở về hầm theo lượng cuộn. Mẫu cadence
59,6 FPS, p95 21,1 ms thuộc phiên bản intro trước thay đổi vòng xoáy, không
đại diện cho bản hiện tại. Chưa đo lại FPS hoặc xác nhận màn hình 120 Hz,
âm thanh/touch trên máy thật.
`check:ui` tổng dừng ở assertion con trỏ custom (CSS baseline đang dùng con
trỏ hệ thống). Chạy riêng tablet đi qua intro/gallery/orbit/transit nhưng dừng
ở ngưỡng pixel vùng tối hố đen. Đã chạy lại mã HEAD gốc qua máy chủ đối chiếu,
không đổi working tree, và gặp cùng lỗi hố đen; báo cáo ở
`artifacts/feature-preservation/baseline/`. Giữ nguyên các assertion này,
không coi bộ UI tổng là PASS.
