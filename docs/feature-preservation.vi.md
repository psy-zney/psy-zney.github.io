# Các tính năng cần giữ khi đổi model

Cập nhật ngày 14/10/2026. Đây là baseline của bản build hiện tại, áp dụng cho
Codex, Gemini và model khác. Các thay đổi đang nằm trong working tree cũng là
công việc của chủ repo; không quay về bản Git cũ để làm check chạy qua.

## Những gì cần giữ

| Luồng | Hành vi cần giữ | Kiểm tra |
| --- | --- | --- |
| Mở trang | Bộ tải dạng sóng, tiến trình dễ đọc; reduced motion bỏ thời gian chờ; dọn timer/listener khi rời trang | `check:experience`, `check:ui` |
| Intro xé không gian (14/10/2026) | Sau loader, chòm sao tĩnh trên nền #030308; cuộn xuống, vuốt lên, phím xuống hoặc nút tròn kích hoạt đúng một chuyến bay 5,5 giây. 0–1s đường nối tụ về sao vàng #FFD166 giữa trái, lõi lớn 3 lần; 1–2,2s hai nửa trời sao tách theo vết rách dọc nghiêng 15°, viền #E0FBFC; 2,2–5,5s camera phối cảnh đi từ z=0 tới -3000 theo đường S nhẹ. Lời chào phải ở z=-800 hiện 2,5s và đi qua 3,5s; lời chào trái ở z=-1800 hiện 3,8s và đi qua 4,8s. 5–5,5s vệt sao ngắn lại, lớp intro nhường cảnh Hệ Mặt Trời ở vị trí hành trình 1,92 và route Home. Không tua theo wheel khi đang bay; mute vẫn bấm được; đổi route hủy animation/listener; tab ẩn tạm dừng; reduced motion vào nội dung ngay. Quay về Cosmos có thể chạy lại. | Mốc camera/hướng bay trong `check:experience`; kích hoạt wheel/nút, hai câu, screenshot vết rách/đến trạm, hủy route và reduced motion trong `check:ui` |
| Hành trình Virgo | Hiện từng câu theo scroll; camera đi nửa vòng tròn 180° quanh mô hình, giữ bán kính, hai câu Porrima ở đầu/cuối nửa vòng; chữ đổi góc trên/trái sang dưới/phải; cuộn ngược khôi phục góc/câu trước | `check:portfolio`, `check:experience`, pose/câu thực trong `check:ui` |
| Phòng chiếu cong | Scene Three.js + CSS3DRenderer với 9 mặt phẳng DOM trên cùng một hình trụ, camera chung; không chia ảnh thành dải CSS gây méo. Tiêu đề Outfit sans-serif; ẩn scrollbar của gallery. Ba preview Sentinel/Security/Backup giữ file gốc và chỉ cắt 16px mép phải chứa scrollbar khi hiển thị. Preview lớn, không có nút X thoát; tự mở sau câu cuối Porrima bằng wheel/touch; Trải nghiệm web → Ứng dụng & công cụ nối bằng ánh sáng; cuộn qua cuối gallery tiếp tục Skills, cuộn ngược trở lại Porrima; link trực tiếp vẫn hoạt động | `check:experience`, pose/matrix CSS3D, font, kích thước/ảnh/luồng thuận/ngược `check:ui` |
| Bay giữa các trạm | Giữ nửa vòng đọc 180°; sau câu cuối quay hướng tại chỗ rồi mới tiến thẳng trên trục Z tới trạm tiếp theo. Không dịch chuyển trong lúc camera còn nhìn ngược và không lượn ngang. Cuộn ngược đi lại đúng đường cũ. Hố đen xuất hiện từ xa trong đoạn Skills → Contact, tăng kích thước bằng phối cảnh; bấm vào workspace tiếp tục tiến trên cùng trục | Lấy mẫu ba đoạn transit theo hai bán kính trong `check:experience`; pose/ảnh ở 5.42 và 5.68, pose liên tục khi vào workspace trong `check:ui` |
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
