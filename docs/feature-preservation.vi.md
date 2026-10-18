# Các tính năng cần giữ khi đổi model

Cập nhật ngày 18/10/2026. Đây là baseline của bản build hiện tại, áp dụng cho
Codex, Gemini và model khác. Các thay đổi đang nằm trong working tree cũng là
công việc của chủ repo; không quay về bản Git cũ để làm check chạy qua.

**Chuyển cảnh đã chốt theo video ngày 15/10:** đọc
[quy tắc bay thẳng](straight-flight-contract.vi.md) trước khi sửa. Camera
chỉ tiến/lùi theo Z lúc chuyển trạm. Chủ repo xác nhận sau đó: giữ xoay quanh
sao lúc đọc; phép quay góc nhìn cục bộ không làm bẻ hướng camera lúc bay.

## Những gì cần giữ

**Hệ thống âm thanh nền vũ trụ và hiệu ứng tương tác (BGM & SFX), 18/10:**
tích hợp hệ thống âm thanh không gian procedural Web Audio API (`src/utils/portfolioAudio.ts`)
kết hợp `VirgoJourneyAudio`:
- Nhạc nền vũ trụ (Cosmic Ambient Pad & Sub-drone) đa tầng (55Hz sub-bass,
  harmonic chord pad A2-E3-G3-B3 và stardust shimmer) vận hành mượt mà,
  không độ trễ (0ms latency), không phụ thuộc tải file ngoài.
- Khi vào Hố đen (`singularityEnter`): Tần số BGM được lọc qua low-pass filter
  (hạ xuống 180-250Hz) mô phỏng không gian bị nén lại bởi lực hấp dẫn; khi ra Lỗ Trắng
  (`singularityExit`): Tiếng bừng sáng giải phóng năng lượng và phục hồi âm phổ.
- Bộ Sound Effects (SFX) cho từng event: `hover` (micro-tick tinh thể siêu nhẹ
  1750Hz với decay 18ms trên các thẻ dự án, tab kỹ năng, link và nút điều khiển),
  `click` (tactile blip 620Hz->280Hz), `drawerOpen`/`drawerClose` (menu Chapters),
  `modalOpen`/`modalClose` (modal Case Study & CV), `cardSlide` (chuyển đổi 9 sản phẩm
  trong 3D Worlds Showcase), `muteOn`/`muteOff` (chime báo trạng thái âm thanh),
  và `loaderComplete` (chime hoàn tất trang loading).
- Đảm bảo nghiêm ngặt: Chờ tương tác người dùng trước khi phát âm thanh (no autoplay),
  ngắt tiếng ngay dưới 100ms khi Mute (`journey-audio-muted`), tự động tạm dừng khi
  chuyển tab (`document.hidden`), an toàn với SSR và pass toàn bộ bài kiểm tra.

**Miệng lỗ trắng có chiều sâu, màu hầm tiết chế, 18/10:** bỏ quầng thoát
Canvas; shader chiếu tia từ camera đang tiến trong một họng hữu hạn đến
mặt thoát z=0. Bề mặt khí trắng sáng nằm quanh miệng; showcase được thấy
qua lỗ mở, giữ preview phẳng. Camera vượt miệng thì bề mặt ra khỏi khung,
không co một quả cầu trên sản phẩm hoặc quay đầu camera. Miệng xuất hiện
từ cuối hầm để nối phối cảnh, rồi tiếp tục pha thoát 5,6–7,8 như cũ.
Bỏ mặt nạ tròn ở chân trời; cảnh thật chìm dần vào tối trước khi hiện
hầm. Hầm giảm saturation/tím, nền thép/xám, giảm optical cone và bụi còn
140 hạt mảnh. Giữ asset gốc, camera orbit, handoff 4,3 và rollback tuyệt đối.
Đây là cách dựng hình giả định nghệ thuật, không phải mô phỏng lỗ trắng
đã quan sát. Thay ghi chú glow thoát và màu hầm trước đây bên dưới.
Kiểm tra shader thay quota pixel sáng >140 bằng tương phản chi tiết >14
vì chủ repo yêu cầu giảm sáng/màu; giữ yêu cầu vùng hầm đọc được >20%,
đồng thời thêm chroma <0,22. Kiểm tra miệng thoát: vùng nhìn xuyên tăng
theo camera tiến, trung tâm không đổi pixel, toàn màn hình sạch khi vượt
miệng, tua ngược họng và hầm đều có 0 pixel sai khác. Bộ shader PASS
desktop/phone/landscape và phục hồi asset lỗi ở `artifacts/white-hole-refinement/`.
`pnpm run check` PASS; worlds PASS desktop/phone gồm camera, shader,
vào/ra, điều hướng và rollback. Đã xem ảnh hầm và lỗ trắng trong hành
trình thật: `artifacts/white-hole-journey/`. `check:ui` tổng vẫn dừng ở
assertion con trỏ baseline dòng 99; chưa đo cảm giác/FPS thiết bị thật.

**Bỏ lớp hiệu ứng dư ở hai đầu hố đen, 18/10:** theo ảnh phản hồi mới,
bỏ 88 đường vàng Canvas và vòng viền cyan khi vào; bỏ lớp vệt bụi
ba tầng và wake phụ vẽ đè khi ra lỗ trắng. Đĩa vật chất vẫn do shader
ray-traced thể hiện; giữ lensing, camera xoắn, lòng hầm tinh vân, ánh thoát
lỗ trắng và rollback theo cùng thời gian. Không thay bằng lớp trang trí
mới. Quy tắc này thay yêu cầu vệt spaghetti Canvas / ba tầng bụi lỗ trắng
trong ghi chú cũ. Bộ worlds kiểm tra không có nét stroke phụ ở hai pha.
Ánh thoát lan rộng và giảm theo exp(-10p)*(1-p), không co thành quả cầu
trắng đục che preview. Lớp tối giảm nhanh theo (1-p)^5; giữ pha thoát và
timeline cũ, nên rollback vẫn dùng đúng ảnh tại cùng tọa độ thời gian.
Kiểm chứng: `pnpm run check` PASS; worlds PASS desktop và phone, gồm
shader, vào/ra, điều hướng và rollback. Theo dõi Canvas xác nhận không
có stroke vẽ đè trong toàn pha bồi tụ và pha thoát. Đã xem ảnh quỹ đạo
và thoát lỗ trắng bản cuối; ảnh/báo cáo ở `artifacts/passage-cleanup-final/`.
`check:ui` tổng vẫn dừng tại assertion con trỏ baseline dòng 99.

**Auto ưu tiên High, yêu cầu mới nhất 18/10:** bỏ nút độ nét công khai.
Intro, scene Virgo và gallery luôn dùng Auto, bỏ qua lựa chọn Low/High cũ
trong localStorage. Khởi đầu High (vẫn tôn trọng Save-Data), ưu tiên lấy
mẫu 1,5× trên màn hình 1× trong trần GPU hiện có, tự giảm sau nhiều khung
chậm liên tiếp và phục hồi khi ổn định. Không đổi camera hoặc timeline.
Graphics trong workspace legacy vẫn giữ lựa chọn riêng như trước.
Quy tắc này thay phần đồng hồ SVG và Auto native trong ghi chú cũ bên dưới.
Kiểm chứng: `pnpm run check` PASS. Bộ render quality PASS desktop, phone
và reduced motion với cấu hình Low cũ trong localStorage; intro/scene/
gallery vẫn bắt đầu ở mức nét High. Đổi preference bằng event không làm
intro chạy hoặc giảm nét. Ảnh và báo cáo: `artifacts/render-auto/`.
Đã xem ảnh Contact desktop/phone không còn nút. `check:ui` tổng vẫn gặp
assertion con trỏ baseline dòng 99; chưa benchmark FPS thiết bị thật.

**Tinh giản HUD theo ảnh chủ repo, 18/10:** bỏ bản đồ chòm sao góc trên
phải cùng chữ VIRGO, bộ đếm chương `03 / 07` và thanh tiến trình sát đáy.
Không tạo vùng nhấn vô hình thay thế; giữ nút Chapters và điều hướng
wheel/bàn phím. Chòm sao mở đầu và các sao trong không gian vẫn giữ nguyên.
Yêu cầu này thay yêu cầu giữ mini-map trong các ghi chú cũ. Kiểm tra SSR
xác nhận các phần HUD đã bỏ không còn trong DOM.
Kiểm chứng: `pnpm run check` PASS; Chrome xác nhận DOM desktop/phone và
đã xem ảnh `artifacts/hud-cleanup/*-contact.png`. `check:ui` tổng vẫn dừng
ở assertion con trỏ baseline dòng 99.

**Đồng hồ SVG độ nét, 18/10:** thay select công khai bằng ba vùng nhấn SVG:
Low xanh bên trái, Auto trắng ở giữa, High đỏ bên phải. Kim và nhãn nhỏ chỉ
mode đang chọn. Đồng hồ thu còn 64×52px; vùng nhấn trong suốt lớn hơn hình
vẫn giữ >=44px. Tooltip ngắn hiện khi đổi mode, hover hoặc focus.
Giữ preference lưu local, đồng bộ giữa các scene, Save-Data, độ nét Retina
và xử lý cadence như trước; không đổi trần ngân sách render.
High công khai yêu cầu tối thiểu 1,5× trên màn hình 1× cho intro, scene và
live gallery (2,25 lần số mẫu); vẫn chịu giới hạn 16,6 triệu pixel, DPR 3
và kích thước GPU. Auto dùng mật độ native và tự thích ứng, Low giữ giới
hạn DPR 1 và ray target hố đen 768. Trên màn hình Retina hoặc máy đủ khỏe,
Auto có thể nhìn gần High. Không đổi camera, thời gian hay nội dung để tạo
khác biệt giả. Workspace legacy vẫn giữ chính sách mật độ cũ.
Arrow/Home/End và Enter/Space điều khiển được, không làm hành trình cuộn;
mỗi vùng có hit target >=44px và tên radio cho trình đọc màn hình.
Không hiện Balanced ở control công khai; giá trị medium cũ được chuyển
sang Auto khi mở portfolio. Tier medium và lựa chọn Graphics trong
workspace legacy vẫn còn. Reduced motion bỏ chuyển động kim và tooltip.

`check-render-quality-ui.mjs` dùng SVG radio thay native select; giữ kiểm
tra DPR thực, đổi chất lượng không làm tiến intro, resize/màn hình mới,
Contact/CV không bị che và live gallery. Bổ sung thứ tự ba mode, hit target,
chọn Auto bằng bàn phím và lưu preference. Ảnh icon ở `artifacts/render-sharpness/`.

Kiểm chứng SVG nhỏ và mức nét: `pnpm run check` PASS. Bộ render quality
PASS desktop 1x, phone 3x, 4K 1x và reduced 2x, gồm ảnh ba trạng thái,
hit target, bàn phím, đổi chất lượng không làm tiến camera, resize và link
Contact/CV không bị che. Desktop đo High 2160×1350 / Auto 1440×900 trên
khung 1440×900; ray target Contact High 2048 / Low 768. 4K vẫn chịu trần
pixel. Đã xem ảnh Low/Auto/High nhỏ, Contact desktop và phone. Báo cáo ở
`artifacts/render-sharpness/report-desktop.json` và
`artifacts/render-sharpness/report-phone-reduced-4k.json`.
`check:ui` tổng vẫn dừng ở assertion con trỏ baseline dòng 99.

**Lòng hầm tinh vân theo ảnh mới, 18/10:** riêng đoạn xuyên hố đen dùng
texture tinh vân gốc được tạo cho hiệu ứng này, chiếu thành ba lớp khí
xanh/cyan/tím với sợi sáng và khoảng tối giữa các nhánh. Không thay ảnh
sản phẩm hoặc GLB. Asset nằm ở `public/img/fx/wormhole-nebula-v1.webp`;
nguồn tạo và prompt đầy đủ trong [ghi chú asset](wormhole-nebula-asset.vi.md).

420 hạt gần/xa chạy theo đường xoắn và có đuôi cong, lấy vị trí tuyệt đối
từ cùng thời gian với shader. Đi tới thấy bụi lướt ra ngoài; lùi khớp lại
đúng trạng thái trước. Giữ timeline 0–3,2 / 3,2–5,6 / 5,6–7,8, handoff,
camera, lỗ trắng, các cổng showcase và reduced motion. Không thêm quay
camera vào đường bay giữa sao hoặc sửa intro. Texture có mipmap và
anisotropy tối đa 4; crossfade tại mép tile tránh vết ghép quanh hầm.
Nếu texture lỗi, shader khí procedural vẫn chạy; giải phóng texture khi
unmount và xử lý callback load muộn sau dispose.

`check-nebula-ui.mjs` kiểm tra render thật desktop/phone/landscape, tua
ngược cùng tọa độ phải cho 0 pixel khác, và phục hồi khi chặn asset.
Bộ worlds vẫn kiểm tra pha hầm có texture đã nạp, lỗ trắng và rollback.

Kiểm chứng lòng hầm mới: `pnpm run check` PASS, bộ worlds PASS cả năm
viewport; đã xem ảnh hầm thực trên desktop và phone. Bộ nebula PASS
desktop/phone/landscape với 0 pixel khác khi tua ngược và PASS trường hợp
texture bị chặn. Ảnh và số đo: `artifacts/nebula-passage/`; ảnh hành trình
thật: `artifacts/worlds-showcase/*-throat.png`. `check:ui` tổng vẫn dừng ở
assertion con trỏ baseline dòng 99. Chưa đo FPS/touch trên thiết bị thật.

**Cụm cổng trên vòm vũ trụ, theo phác thảo mới 18/10:** thay hàng ba cổng
bằng chín vị trí cố định trên một mặt cầu lõm nông. Cổng đang chọn tiến
ra giữa, lớn và chính diện; cổng cũ thu nhỏ về đúng địa chỉ phía sau.
Cổng đã qua và chưa tới đều còn trên nền, kể cả landscape. Mỗi nhịp cuộn
lặp cùng chuyển động lấy nét có phối cảnh XYZ/yaw/pitch/roll nhẹ; không
thêm autoplay hoặc xoay camera hành trình. Giữ các mốc đầu/cuối, wheel
ngược ở đích đầu về Contact, nút Về Virgo và Escape như cũ.

DOM và plasma dùng cùng phép chiếu: shader lấy nghịch đảo homography của
CSS matrix hiện tại để rim bám đúng mặt cổng cả khi nghiêng và đang tiến
ra. Chín cổng vẫn dùng một renderer, 60Hz trong chuyển động và 24Hz khi
đứng; dòng năng lượng nối các địa chỉ theo đường cong. Preview trung tâm
giữ mặt phẳng, không displacement hoặc chromatic aberration. Quy tắc này
thay bố cục hàng ba và ẩn cổng nền ở landscape trong ghi chú cũ bên dưới.

Kiểm chứng bố cục vòm: `pnpm run check` PASS; bộ worlds PASS năm viewport,
gồm đủ chín cổng nền, độ sâu/góc nghiêng thật, lấy nét lặp qua wheel, live
preview và rollback. Đã xem ảnh desktop, bước tiếp theo, đích cuối, phone
và landscape. Chỉnh cuối riêng landscape giữ khoảng hở dưới heading,
kiểm tra lại PASS tại `artifacts/worlds-showcase/landscape-refinement/`;
report năm viewport vẫn giữ ở thư mục cha. `check:ui` vẫn dừng tại assertion
con trỏ baseline dòng 99; chưa benchmark FPS trên thiết bị thật.

**Cosmic optics và time rewind, 18/10:** nền showcase là vũ trụ sâu với
ba cổng plasma nối bằng dòng năng lượng, dùng chung một WebGL renderer.
Ảnh sản phẩm gốc nằm trên lớp DOM phẳng, chiếm hơn 70% đường kính cổng;
không đưa ảnh hoặc chữ qua displacement/chromatic aberration. Khi ở đầu
hoặc cuối danh sách, vẫn cho thấy ba đích; chín URL và thứ tự điều hướng
giữ nguyên. Landscape ngắn chỉ hiện cổng đang chọn để dành chỗ cho caption.

Mask ngoại vi phải bằng đúng 0 ở bán kính màn hình chuẩn hóa <=0,60;
lensing và tách RGB chỉ tác động bên ngoài. Nón quang học xanh/tím dùng
chung GLSL cho intro và passage, biên độ nhỏ theo pha chuyển động. Tham số
beta=1,16 là giả định nghệ thuật; quan hệ Cherenkov thực chỉ áp dụng trong
môi trường có beta*n>1. Không mô tả hiệu ứng này là mô phỏng vật lý đầy đủ.

Rollback lấy lại cùng thời gian tuyệt đối cho camera, bank, khí bồi tụ,
hầm và bụi lỗ trắng. Giữ ba tầng bụi với seed cố định, không tích phân vị
trí qua từng frame. Chỉ cổng Contact dùng quỹ đạo xoắn cục bộ; các chặng
giữa sao và orbit đọc giữ hợp đồng cũ. Escape giữa chuyến bay vẫn quay về
từ vị trí hiện tại. Khi unmount, hủy RAF và giải phóng tài nguyên GPU;
React effect replay phải dùng canvas WebGL mới, tránh tái dùng context đã
bị forceContextLoss. Chi tiết và công thức: [kiến trúc đồ họa](graphics-architecture.vi.md).

Kiểm tra pixel tia intro giữ ngưỡng sáng, aspect >3 và độ dày <8px; đo
thành phần sáng liên thông của thân tia để sao nền rời rạc trong crop không
bị tính thành mép tia. Lượt landscape phát hiện một pixel sao rời ở y=149
trong khi thân tia ở y=157–159; ảnh đối chiếu nằm trong
`artifacts/portal-open-flow/intro/landscape-shot-failure.png`.

Kiểm chứng cosmic optics: `pnpm run check` PASS. Bộ worlds PASS cả năm
viewport; kiểm tra GLSL thực trên checkerboard ghi nhận 0 pixel trung tâm
đổi màu và 21.056 pixel ngoại vi thay đổi. Đã xem ảnh showcase desktop/
phone/landscape, quỹ đạo, hầm và thoát lỗ trắng. Intro PASS desktop/tablet/
phone trong `intro/report.json`, landscape/reduced trong
`intro/report-landscape-reduced.json`; thân tia landscape đo 3px, loại đúng
1 pixel sao nền rời. `pnpm run check:ui` vẫn dừng tại assertion con trỏ
baseline dòng 99, trước khi có kết quả hồi quy tổng. Không tuyên bố suite
này PASS. Chưa đo FPS hoặc touch trên thiết bị thật.

**Quỹ đạo xoắn theo ảnh vẽ đỏ, 18/10:** chủ repo yêu cầu góc nhìn bị cuốn
vòng quanh hố đen rồi mới thu vào lõi. Camera cục bộ chạy 1,45 vòng theo
`singularityView`, dịch XYZ thật và bank nhẹ; renderer hố đen đổi góc
observer tương ứng, vẫn giữ góc orbit thủ công của người xem. Đây là ngoại
lệ riêng tại cổng Contact; không đổi đường bay giữa các sao. Observer ray
được cập nhật tối đa 12Hz, ray/shade cùng 768 desktop hoặc 512 phone khi
đang xoắn để giới hạn chi phí; bên ngoài dùng ngân sách chất lượng cũ.

Chuyển cảnh giờ dài 7,8s: xoắn 3,2s → hầm khí 2,4s → lỗ trắng 2,2s.
Handoff ở 4,3s. Chân trời tối nở vượt khung hình trước khi hầm lên sáng.
Hầm dùng shader khí tím/xanh, vân sáng advection, xoáy theo chiều sâu và
bụi cong; thay các vòng nét đơn giản trong đoạn bay. Reduced motion bỏ
chờ kể cả khi preference đổi giữa chuyến bay. Rollback vẫn đảo tọa độ
camera, bụi và hiệu ứng. Các mốc 5,4s và cấm orbit cục bộ ở lịch sử bên
dưới được thay riêng bởi yêu cầu mới này. Kiểm tra bổ sung đo pose camera
thật, chuyển sang cả hai phía và đi đủ một vòng trước khi vào hầm.
Kiểm chứng lượt này: `pnpm run check` PASS; bộ worlds PASS cả năm viewport
với shader/runtime không lỗi, camera thực đi đủ vòng, chiều về và Escape
giữa chuyến bay. Đã xem ảnh quỹ đạo desktop/tablet và hầm khí. Pose từng
frame lưu ở `artifacts/worlds-showcase/*-spiral-poses.json`. `check:ui`
vẫn dừng tại assertion con trỏ baseline dòng 99. Chưa đo FPS máy thật.

**Spaghettification, lực hút và rollback theo phản hồi 18/10:** tham khảo
[NASA SVS – Black Hole Accretion Disk](https://svs.gsfc.nasa.gov/13326/) và
[NASA – Anatomy](https://science.nasa.gov/universe/black-holes/anatomy/).
Khí thật trong shader đĩa chạy clock nhanh 3,2 lần, thêm advection hướng vào
trong; giữ ray Kerr, vùng bóng, đĩa phía trước và cache tia. Clock tiếp tục
khi đang vào hố đen. Sợi vật chất có đầu rơi nhanh hơn đuôi: quay nhiều vòng,
bán kính thu dần, kéo dài và mỏng hơn trước khi mất vào lõi. Shader thấu kính
bóp méo ảnh WebGL đang render bằng trường biến dạng liên tục; không ghép các
dải ảnh gây đường cắt. Đây là diễn họa, không phải mô phỏng GRMHD.

Nút Về Virgo, Escape ở bộ chọn và cuộn ngược tại thế giới đầu chạy ngược
cùng timeline 5,4s. Escape/cuộn ngược trong lúc đang đi đảo ngay từ tọa độ
hiện tại. Handoff route dùng mốc trong timeline, không timer riêng. Camera
trả chiều sâu từ lõi ra Contact theo trục cũ; không tự quay camera. Tab ẩn
dừng tiến độ. Reduced motion về ngay. `singularityMotion.ts` được kiểm tra
co bán kính, quay vòng, độ mảnh, đầu/đuôi và đối xứng timeline hai chiều;
`check-worlds-ui.mjs` kiểm tra quay về bằng nút, wheel và hủy giữa đường.
Kiểm chứng cuối: `pnpm run check` PASS; bộ worlds PASS desktop/tablet/
phone/landscape/reduced với quay về bằng nút, cuộn ngược tại thế giới đầu,
Escape khi đang bay và xác nhận cảnh WebGL được lấy để bóp méo. Đã xem ảnh
spaghettification và thấu kính trên desktop/phone; sửa đường ghép ảnh bằng
shader liên tục rồi chạy lại trên source cố định. `check:ui` vẫn dừng ở
assertion con trỏ baseline dòng 99. Chưa đo FPS/touch máy thật.

**Sửa theo phản hồi ảnh 18/10:** bỏ ảnh oval sát viền cổng. Mỗi cửa có
lòng hầm chiếu phối cảnh nhiều lớp với vật liệu khí mềm và hạt theo độ sâu;
preview thật nằm ở miệng xa. Chuyển cảnh giữ một canvas liên tục 5,4 giây:
0–1,8s vật chất chuyển động quanh mặt phẳng đĩa bồi tụ rồi thu vào lõi;
1,8–3,2s xuyên lòng hầm tới cửa sáng; 3,2–5,4s lõi trắng thu nhỏ và vật chất
phóng ra ngoài, lộ dần các thế giới. Không thay bằng chớp sáng rồi cắt cảnh.
Route có thể chuyển dưới canvas, canvas chỉ gỡ khi pha thoát hoàn tất.
Reduced motion bỏ toàn bộ đoạn chờ. Đây là diễn họa Canvas theo phối cảnh,
không phải mô phỏng tương đối tính hoặc phá hủy mesh gốc.
`check-worlds-ui.mjs` kiểm tra đủ ba pha và chụp ảnh từng pha.
Kiểm chứng lượt sửa: `pnpm run check` PASS; bộ worlds PASS trên cả năm
viewport với ba pha accretion/throat/white-hole-exit. Đã xem ảnh vật chất
quanh đĩa, lõi trắng phóng hạt và các cửa thế giới. Lượt đầu tablet bị chồng
nút/footer, đã sửa bố cục và chạy lại trên source cố định. `check:ui` vẫn
dừng tại assertion con trỏ baseline dòng 99. Chưa đo FPS trên máy thật.

**Thiết kế lại showcase theo yêu cầu chủ repo, 18/10/2026:** thay gallery
tự vào giữa Porrima → Skills bằng vùng thế giới sau hố đen Contact.
Nút/Enter trên cổng cuối bay thẳng, bụi hội tụ rồi ánh sáng mở ra bộ chọn.
Workspace/OS vẫn giữ route cũ để bảo toàn nội dung, nhưng không còn là
đích của cửa hố đen trong luồng chính.

Bộ chọn có một cổng chính, hai cổng lân cận, dùng preview gốc và màu riêng
của chín sản phẩm. Mỗi thế giới giữ `#/showcase/:id`, website và case study.
Một cử chỉ wheel chọn một thế giới; đuôi trackpad không nhảy nhiều đích,
đảo chiều nhận ngay. Phím mũi tên/Home/End, vuốt dọc và nút trước/sau cùng
hoạt động. Enter tiến vào gallery cong để xem và dùng live preview. Đóng
gallery về bộ chọn; đóng bộ chọn về đúng hố đen cuối Contact. Case study
trở về đúng sản phẩm và chế độ xem trước đó.

Nhịp hành trình: bước wheel tối đa 0,22 viewport, lead 0,32 viewport;
rút track About/More projects từ 300/280 xuống 240/220vh. Intro dùng gain
0,95, bước 0,55, lead 0,85, tốc độ 1,9 và gia tốc 7,2; vẫn mở cổng bằng
một cử chỉ, cử chỉ tiếp mới bay, giữ dừng/lùi và hướng camera cũ. Vật liệu
hầm giảm bão hòa tím, tăng suy giảm ánh sáng theo chiều sâu, giữ rim
trắng tím và sợi ánh lạnh. Không thay asset gốc.

Các yêu cầu tự vào gallery tại Porrima và Contact → workspace trong lịch
sử bên dưới được thay bằng luồng mới. Kiểm tra mới:
`node scripts/check-worlds-ui.mjs`, ảnh/report tại `artifacts/worlds-showcase/`.
Bộ mới đã PASS desktop/tablet/phone/landscape/reduced: bố cục, burst/reverse,
phím, case-study return, gallery và cửa hố đen. `check:ui` vẫn dừng ở lỗi
con trỏ baseline, không coi bộ tổng là PASS. Hiệu ứng bụi hiện là lớp hạt
hội tụ cùng chuyến bay, chưa phải phá hủy từng mesh hay mô phỏng vật lý.

Kiểm chứng cuối 18/10: `pnpm run check` PASS (còn cảnh báo bundle >500kB).
Intro PASS desktop/phone với assertion màu giữ nguyên, reduced PASS riêng
sau khi chuyển tọa độ click test khỏi nút chất lượng sang giữa cổng.
Đã xem ảnh desktop/phone/landscape, hố đen khi vào và cổng mở đầu.
`check-scroll-ui.mjs` PASS desktop/phone; reduced dừng tại assertion mã
trạm orbit dòng 65 (2 thay vì 1), chưa xác minh nguyên nhân. Không ghi bộ
scroll tổng là PASS. Chưa đo FPS hoặc touch/âm thanh trên thiết bị thật.

**Ưu tiên chi tiết và độ nét trên mọi màn, 17/10:** cảnh Virgo, intro,
gallery và workspace dùng mật độ pixel thật, tối đa DPR 3 ở High; Medium
tối đa 2, Low tối đa 1. Bảo vệ GPU bằng ngân sách lần lượt 16,6 / 8,3 / 2,1
triệu pixel và giới hạn kích thước thiết bị, kể cả màn ultrawide/8K. Reduced
motion giữ độ nét, chỉ giảm chuyển động. Đổi màn/zoom/resize cập nhật backing
buffer cả khi cảnh dùng demand render, không dựng lại camera.
Auto khởi đầu High (Save-Data vẫn Low), hạ mật độ sau nhiều cửa sổ khung hình
chậm và phục hồi khi máy khỏe lại; hidden/pause không làm giảm chất lượng.
Lựa chọn độ nét yên ở góc trên trái, tách khỏi footer Contact/CV: Auto, Nét tối đa, Cân bằng,
Tiết kiệm; dùng chung preference với Graphics trong workspace và lưu local.
Nét tối đa bỏ hạ mật độ theo cadence, vẫn giữ trần tài nguyên thiết bị.
Workspace giữ cơ chế đổi tier tự động cũ; High tăng shadow map lên 2048².
MSAA bật cho cảnh chính/workspace; gallery giữ MSAA và ambient cap 24/18.
Liquid intro shade đủ backing buffer thay vì 85% kích thước CSS; atlas chữ
gấp đôi mỗi chiều, các tam giác lấy thêm texel/overlap để không rạn glyph ở
đường ghép. Hố đen chọn LOD theo kích thước chiếu, tối đa High 2048²,
Medium 1536², Low 768²; khi đổi góc tối đa 1280² rồi trả chi tiết khi ổn định.
Giữ rayResolution = resolution, cache tia, bloom và khóa resolution khi entry.
Không thay ảnh/model gốc, palette, hình cổng, camera, orbit đọc hay input.
Check logic trong `check-current-features.mjs` giữ native Retina/phone/4K,
giới hạn GPU, hạ/phục hồi cadence và pause. Browser check bổ sung:
`node scripts/check-render-quality-ui.mjs http://127.0.0.1:5183/`; ảnh/report
ở `artifacts/render-sharpness/`, đo buffer thật, MSAA, liquid, đổi chất lượng,
resize, chuyển DPR khi reduced, gallery và workspace.
Kiểm chứng: `pnpm run check` PASS trên source cuối. Render QA PASS desktop
1440×900 DPR 1/2, phone 390×844 DPR 3, 4K 3840×2160 DPR 1 và reduced DPR 2;
workspace Retina PASS. Bắt lỗi DPR không cập nhật ở cảnh tĩnh, đã thêm fallback
nhẹ mỗi giây và xác nhận chuyển 2→3→2 mà không bật lại animation. Đã sửa chồng
ô chọn/CV bằng vị trí góc trên trái, đo lại Contact trên năm viewport desktop,
tablet, phone, landscape và 4K đều PASS. Intro bản cuối và showcase đều PASS
desktop/phone/reduced; đã xem ảnh chữ trên vách, cổng, scene Retina/4K, hố đen,
workspace, gallery và Contact phone. `quality-summary.json` tổng hợp các lượt
chạy, report gốc giữ các lỗi đã bắt trong quá trình sửa. `check:ui` cuối vẫn
dừng ở lỗi con trỏ baseline `check-ui.mjs:98`; không ghi bộ tổng là PASS.
Chưa đo FPS, touch/âm thanh trên thiết bị thật; build còn cảnh báo chunk >500 kB.

**Thân tia rõ, bỏ quả cầu nổ, 17/10:** ảnh phản hồi cho thấy xung tròn quá
lớn che mất tia. Thay đĩa/halo bằng một thân tia trắng tím mảnh, chiếu theo
Z từ cạnh trục nhìn vào sao đích để còn thấy chiều dài; camera vẫn chính
diện, tia không bay từ đáy lên. Điểm chạm chỉ lóe trong bán kính tối đa 9px,
không có khối sáng lớn. Giữ một tia, thứ tự chạm/mở, scroll/reverse và toàn
bộ hành trình. Chốt này thay yêu cầu cũ giữ tâm của cả đuôi tia trùng đích.
Check UI đo tỷ lệ dài/mỏng trên pixel thật để không cho quả cầu PASS nữa.
Bằng chứng: `artifacts/visible-portal-beam/`.
Kiểm chứng cuối ở `final/`: `pnpm run check` PASS; intro desktop/phone/
reduced PASS, đã xem chuỗi tia gần/đang bay/chạm trên desktop và phone.
Lượt đầu phone FAIL vì thân tia thu ngắn, lẫn quầng sao; đã sửa gia tốc
chiếu theo chiều sâu, giữ nguyên ngưỡng dài/mỏng và chạy lại cả ba chế độ.
UI tổng vẫn dừng ở lỗi con trỏ baseline dòng 98. Chưa thử tablet/landscape,
FPS, touch/âm thanh máy thật.

**Tia bắn dọc trục chính diện, 17/10:** theo chỉnh góc tiếp theo, không
vẽ tia từ đáy màn hình bay lên. Người xem nhìn dọc thân tia: lõi trắng tím
và đuôi sáng cùng tâm cổng, thu nhỏ theo phối cảnh khi đi xa vào chiều sâu,
chạm sáng rồi mở cổng. Chỉ một xung, không lắc/di chuyển camera hoặc bầu
sao; giữ các mốc cuộn, lùi và cổng plasma cũ. Logic kiểm tra tâm X/Y cố
định và bán kính thu theo Z; UI đo pixel trên mặt tia ngoài sao trung tâm.
Bằng chứng: `artifacts/frontal-portal-shot/`.
Kiểm chứng: `pnpm run check` PASS; intro desktop/phone/reduced PASS, đã
xem ảnh tia chính diện và điểm chạm trên desktop/phone. UI tổng vẫn dừng
ở lỗi con trỏ baseline dòng 98. Chưa chạy lại tablet/landscape, đo FPS hoặc
thử touch/âm thanh trên thiết bị thật.

**Một tia bắn rồi mở cổng, 17/10:** cuộn đầu bắn một tia thẳng tím trắng
từ phía người xem vào sao trung tâm; chạm ở 0,42, sáng cục bộ rồi plasma
mới mở. Không có mảnh kính hoặc sét phân nhánh. Tia/va chạm lấy từ tọa độ
cuộn, không tự bắn lặp theo ambient; lùi phục hồi cùng đường. Giữ góc chính
diện, một roll hoàn tất tại 2,75, gesture tiếp mới bay, camera/bầu sao/vách
hầm/chữ/cửa ra như cũ. Thay chốt “plasma hiện ngay” ở mục lịch sử bên dưới.
Check logic đo thứ tự tia → va chạm → cổng; UI đo pixel tia thật và chụp
ba mốc trên desktop/phone. Bằng chứng: `artifacts/portal-shot/`.
Kiểm chứng: `pnpm run check` PASS; intro desktop/phone/reduced PASS, đã
xem ảnh tia bay, va chạm và cổng mở trên desktop/phone. UI tổng vẫn dừng
ở con trỏ baseline dòng 98. Chưa chạy lại tablet/landscape, đo FPS hay thử
touch/âm thanh trên thiết bị thật.

**Bỏ đoạn kính rạn/sét theo ảnh, 17/10:** cổng plasma tím mở trực tiếp từ
nhịp cuộn đầu. Gỡ renderer mảnh kính, vết nứt và tia sét; trải độ mở plasma
trên khoảng 0–2,75 để không giữ một đoạn chờ trống. Một roll vẫn mở hết,
gesture tiếp mới bay; góc chính diện, bầu sao cố định, vách hầm/chữ/cửa ra
và cuộn lùi giữ nguyên. Check thay yêu cầu kính/sét trước cổng bằng kiểm tra
plasma hiện ngay và không có kính ở cả hai chiều. Yêu cầu này thay riêng
phần kính rạn được ghi trong các mục lịch sử bên dưới.
Kiểm chứng: `pnpm run check` PASS, intro desktop/phone/reduced PASS, đã xem
ảnh plasma ở đoạn từng có kính và khi cuộn lùi. Ảnh/report lưu tại
`artifacts/direct-plasma/`. `check:ui` vẫn dừng ở lỗi con trỏ baseline dòng
98. Chưa chạy lại tablet/landscape hoặc thử touch/âm thanh trên thiết bị thật.

**Cổng tím chính diện theo TikTok, 17/10:** tham chiếu video
`https://www.tiktok.com/@hungbeoedit/video/7341566042126273812` đã xem trong
browser: vết xé dọc, viền trắng tím nham nhở và sợi plasma tỏa ra ngoài.
Thay vật liệu và khẩu độ cổng vào intro bằng mép rách cùng hình học ở Canvas
và WebGL, nhìn chính diện, không nghiêng mặt cổng hoặc quay camera. Giữ kính
rạn trước cổng, bầu sao cố định, một roll mở hết, gesture tiếp mới bay, lùi
khớp hình học; giữ nguyên vách liquid/chữ và cửa ra. Có Canvas recovery;
không nhúng video hay thay asset thật. Check logic kiểm tra viền liên tục,
khẩu độ thông và mặt phẳng chính diện; check intro đối chiếu màu/plasma,
giữ input, camera và khả năng đi/về. Bằng chứng: `artifacts/quantum-tiktok/`.
Kiểm chứng: `pnpm run check` PASS; intro desktop/phone/reduced PASS, đã xem
ảnh vết xé, cổng mở, vách hầm và cửa ra. `check:ui` đã chạy, vẫn dừng ở lỗi
con trỏ baseline dòng 98; không bỏ assertion này. Chưa chạy lại tablet/
landscape, chưa đo FPS hoặc thử touch/âm thanh trên thiết bị thật. Canvas
recovery có kiểm tra hình học/opacity; chưa chụp riêng trường hợp mất WebGL.

**Thao tác trong live preview, 17/10:** iframe đang xem nhận click, nhập và
cuộn website trực tiếp; bỏ inert/pointer-events khóa preview. Chỉ frame
active đã tải xong nhận pointer/focus. Wheel/drag trên mặt web không điều
khiển gallery; thao tác ngoài preview và phím khi focus rail vẫn điều
hướng thế giới. Giữ capture, reader phẳng, một iframe active và nhường
preview khi xuyên cổng. Chốt mới thay preview chỉ xem thụ động trước đây.
Check UI dùng web fixture dài, click/nhập thật và wheel xuống/lên, xác
nhận độ sâu gallery đứng yên; drag/look được thử ở nền ngoài preview.
Frame native được đặt ở lớp 2D bám theo bounds màn hình đang xem, ngoài
chuỗi CSS3D/scale gây lỗi hit-test Chromium. Ảnh gốc/bề mặt cong và thế
giới 3D vẫn giữ; web live dùng viewport responsive đúng kích thước hiển
thị, không scale viewport 1280. Khi xuyên cổng/ẩn tab/đổi thế giới vẫn
unmount iframe và hủy vòng căn vị trí.
Kiểm chứng: `pnpm run check` PASS, showcase desktop/phone/reduced PASS
với fixture HTML có scroll, click/nhập/wheel thật và kiểm tra gallery không
dịch chuyển. Đã xem ảnh tại `artifacts/interactive-preview/final/`.
`check:ui` còn lỗi con trỏ baseline dòng 98; chưa thử touch/trackpad vật lý
hoặc các thao tác đăng nhập/gửi form trên website bên ngoài.

**Vết rạn lan dần, 17/10:** bắt đầu từ điểm va chạm giữa, hai đầu nứt lan
dọc rồi tỏa sang các mảnh kính. Front hé lộ hình học sẵn có, không phóng
to toàn bộ mảnh cùng lúc; sét/bụi chỉ hiện trong vùng đã rạn. Điểm sáng
nhỏ theo đầu nứt rồi tắt khi lan hết. Growth theo tọa độ cuộn nên lùi thu
lại đúng đường, giữ một-roll mở, kính/sét trước cổng và bầu sao cố định.
Check logic đo growth đơn điệu; UI chụp seed/lan/rạn hoàn chỉnh trước cổng.
Kiểm chứng: `pnpm run check` và intro desktop/phone PASS; đã xem ảnh tại
`artifacts/spreading-rift/`. `check:ui` còn lỗi con trỏ baseline dòng 98.
Chưa chạy lại tablet/landscape/reduced hoặc thử thiết bị vật lý trong lượt này.

**Bỏ xoắn bầu sao, 17/10:** sao nền, các đỉnh chòm Virgo và đường nối giữ
tọa độ cố định khi kính nứt/cổng mở, kể cả ambient và cuộn lùi. Bỏ shear
xoay và hút quanh cổng; chỉ giữ nhấp nháy độ sáng của sao. Không đổi orbit
đọc ở các hệ sao, hình cổng hay camera. Check vị trí thay assertion cũ
buộc bầu sao xoắn; yêu cầu mới này thay riêng shear trong lịch sử bên dưới.
Kiểm chứng: `pnpm run check` và intro desktop/phone PASS, đã xem ảnh.
Bằng chứng ở `artifacts/fixed-intro-sky/`; `check:ui` vẫn dừng ở lỗi con
trỏ baseline dòng 98. Chưa chạy lại tablet/landscape trong lượt này.

**Kính nứt và sét trước cổng, 17/10:** một roll vẫn hoàn tất mở, nhưng
giai đoạn 0–1,20 là mặt rạn kính riêng, có các tia giật đôi ngắn ở cạnh.
Vết nứt hiện, tồn tại rồi tan hết; rim/liquid của cổng chỉ xuất hiện sau
1,20. Không phủ vết kính/sét lên cổng. Hình mảnh không rung, tia chỉ nhấp
sáng cục bộ; camera Z=1000 tới 2,75. Check logic và UI xác nhận seam/rim
không chồng giai đoạn, có khoảng tồn tại vết rạn và vẫn một-roll mở hết.
Kiểm chứng: `pnpm run check` PASS; intro desktop PASS, phone/reduced PASS
sau chỉnh vùng đo cửa hẹp để loại sao nền. Vết xé liquid giờ đo tại 1,45
vì 1,00 là kính rạn chưa có cổng. Đã xem ảnh kính/sét và cổng mở sạch tại
`artifacts/glass-lightning-before-portal/`. `check:ui` vẫn dừng ở lỗi con trỏ
baseline dòng 98; chưa thử trackpad/touch vật lý hoặc đo FPS.

**Chi tiết vết nứt, 17/10:** vết xé có mép gồ nhỏ cố định, nhánh dài ngắn
khác nhau và nhánh tóc tách phụ, ba lớp viền tím cùng hạt sáng bám mép.
Theo ảnh kính vỡ tiếp theo, các nhánh được nối thành mảnh tam giác bất
quy tắc: mặt trong suốt, phản quang lạnh và cạnh kép, tách nhẹ theo độ mở.
Hình học mảnh chỉ phụ thuộc cuộn, không bay/rung theo ambient. Chi tiết
ở ngoài mép cửa, tan cùng seam để không phủ kín đường hầm.
Hình nứt không rung theo đồng hồ; ambient chỉ chạy điểm sáng. Mật độ giảm
trên phone, chi tiết tan theo seam cũ. Giữ một-roll mở cổng, camera đứng
chờ, nhịp roll, màu tinh vân và khả năng lùi. Ảnh fracture/expanding trong
bộ intro là bằng chứng hình ảnh cho thay đổi này.

**Một roll tạo cổng, 17/10:** roll tiến đầu tiên đặt đích mở hẳn tại 2,75;
camera vẫn đứng Z=1000, đi qua vết nứt nhỏ rồi mới thành cổng. Đuôi cùng
gesture không bay vào; cần gesture tiếp theo sau khi mở. Cuộn lùi vẫn hãm
và thu cổng, touch/keyboard giữ điều khiển liên tục. Điều này thay yêu cầu
phải cuộn từng bước để mở trong những ghi nhận cũ. Vết nứt phân nhánh nhẹ
tan khi cổng rộng, giữ bảng màu tinh vân và giới hạn tốc độ hiện tại.
Kiểm chứng: `pnpm run check` PASS; intro desktop/phone/reduced PASS,
đã xem ảnh nứt và mở. Bộ kiểm tra dùng wheel thật cho một-roll/roll-tiếp,
touch event đầy đủ cho các mốc hình học chi tiết. Bằng chứng ở
`artifacts/one-roll-rift/`. `check:ui` còn lỗi con trỏ baseline dòng 98;
chưa thử trackpad trên thiết bị thật.

**Màu tinh vân, 17/10:** cổng và vân liquid dùng chàm–tím, điểm xanh ngọc
và ánh trắng sao; thay bảng xanh–cam cũ theo phản hồi mới. Shader chung
của intro/showcase và Canvas fallback cùng bảng màu, hạt bụi/tia mở cổng
đồng bộ. Giữ hình học, nhịp roll và camera. Check ảnh phân biệt vân tím
và ánh lạnh; không còn yêu cầu pixel cam trong những ghi nhận lịch sử.
Kiểm chứng: `pnpm run check` PASS, intro desktop/phone PASS và đã xem ảnh
bảng màu mới tại `artifacts/nebula-palette/intro/`. `check:ui` còn lỗi con
trỏ baseline dòng 98; chưa chạy lại toàn bộ showcase trong lượt đổi màu.

**Nhịp roll ổn định, 17/10:** showcase dùng đích cuộn thay vì cộng xung vào
vận tốc. Một delta 120 đi tối đa 0,14 thế giới, hàng đợi không quá 0,32;
tốc độ giới hạn 0,8 thế giới/s, gia tốc 3 thế giới/s², đổi chiều bỏ đích dư.
Trackpad giữ bước nhỏ liên tục; drag vẫn có quán tính riêng. Intro giữ gain
0,60 và tốc độ tối đa 1,25 xuyên suốt, không tăng nhạy khi vào hầm.
Cổng showcase hiện dần từ xa, mép liquid nhấp nhô và tia điện giảm cường độ.
Preview ở xa giảm sáng theo chiều sâu, tránh nhiều website sáng chồng lên
thế giới đang đọc; tiến gần phục hồi liên tục.
Giữ URL, preview thật, camera thẳng và thoát showcase không xoáy.
Check motion bao gồm burst, delta bất thường, đổi chiều, dừng và 30/60/120 Hz.
Kiểm chứng: `pnpm run check` PASS; intro và showcase PASS desktop/phone/
reduced. Đã xem ảnh cổng, màn hình và đoạn xuyên cổng. Bằng chứng mới ở
`artifacts/scroll-rhythm/`. Lượt showcase đầu gặp lỗi chờ arrival trên phone
trong lúc source đang cập nhật; chạy lại bản ổn định cả ba chế độ đều PASS.
`check:ui` vẫn dừng tại lỗi con trỏ baseline dòng 98. Chưa đo FPS hoặc thử
chuột/trackpad thật; tablet/landscape chưa chạy lại trong lượt này.

**Tự tạo lỗ không gian rồi bay vào, 16/10:** khi đứng ngắm, cổng bắt đầu
bằng năng lượng tụ và một vết rách dọc; cuộn kéo vết rách rộng thành cửa.
Không xuất hiện như vòng tròn tí hon có sẵn trên sao. Chiều cao hình thành
sớm, chiều ngang mở dần; khẩu độ và khí rim dùng cùng aspect ở WebGL lẫn
Canvas fallback. Mở xong cổng nằm phía trước, camera vẫn Z=1000 đến mốc
2,75, cuộn tiếp mới bay vào. Giữ input/khả năng dừng và lùi, liquid xanh–cam,
chữ đọc, cửa ra và tâm hầm không bị phủ đen. Không có đồng hồ tự mở cổng;
ambient chỉ làm khí/tia nhỏ chuyển động. Check intro đo ảnh vết rách cao,
aspect mở rộng, camera đứng yên và phục hồi hình học khi lùi. Bằng chứng ở
`artifacts/intro-rift-creation/`.
Kiểm chứng: `pnpm run check` PASS; intro PASS desktop/tablet/phone/landscape/
reduced, đã xem ảnh tụ/xé/mở, đường hầm và các viewport. Đã tạo cổng bằng
chạm trong browser: dừng ở 2,730, aspect 1, camera vẫn [0,0,1000]; cuộn tiếp
mới tiến vào. UI tổng còn lỗi con trỏ baseline dòng 98. Chưa đo FPS/touch
trên thiết bị thật.

**Bỏ mảng đen bịt tâm hầm, 16/10:** không vẽ haze/đĩa đen phủ lên điểm tụ
ở cuối intro. Giữ nguyên vân liquid tới tâm; nền liquid vẫn opaque trước
khi cửa ra gần nên Home không lộ sớm. Giữ cửa mở thật, đường camera, chiều
đọc, nhịp cuộn và cuộn ngược. Chốt này thay yêu cầu pixel tâm phải đen trong
các ghi nhận lịch sử bên dưới. Check intro đo vùng tâm không còn mảng RGB 0
và vẫn opaque trong sáu mốc vào/đọc/pause/quay lại. Bằng chứng ở
`artifacts/intro-open-centre/`.
Kiểm chứng: test trước sửa FAIL (40,1% vùng tâm desktop đen hoàn toàn).
Sau sửa, `pnpm run check` và intro năm chế độ PASS; đã xem ảnh vào/đọc/cửa
ra và ảnh các viewport. UI tổng vẫn dừng ở lỗi con trỏ baseline dòng 98.
Chưa kiểm chứng FPS/touch trên thiết bị thật.

**Khôi phục bề mặt cả ba sao, 16/10:** lỗi cập nhật nóng có thể thay object
uniforms nhưng shader đã biên dịch vẫn đọc object cũ, giữ opacity 0 và chỉ
còn quầng sáng/plasma. `VirgoNode` phải tạo vật liệu cùng uniforms, gắn cả
vật liệu bằng primitive và cập nhật chính uniforms của vật liệu đó; khi thay
phải dispose vật liệu cũ. Không chỉ thay prop uniforms trên shader đã dùng.
Giữ shader plasma, màu, quầng sáng, quỹ đạo, camera và hố đen. Check sao đo
chi tiết bề mặt Spica/Porrima/Vindemiatrix qua nhiều lượt đi/quay lại, ngoài
các mốc rời Skills đã có. Bằng chứng ở `artifacts/stellar-surface-recovery/`.
Đã bắt lỗi trong phiên đang mở: opacity Porrima cần 0,556 nhưng bộ uniforms
GPU vẫn giữ 0. Sau sửa, cập nhật nóng rồi quay lại cả ba trạm vẫn thấy bề
mặt. `pnpm run check` và check sao desktop/phone/landscape/reduced PASS;
đã xem ảnh. UI tổng còn lỗi con trỏ baseline dòng 98. Các lượt tải mới PASS
trước đó không đủ phát hiện lỗi cache này; chưa đo FPS/touch máy thật.

**Chiều đọc chữ trong hầm, 16/10:** đầu câu gần người xem, các từ tiếp theo
lùi dần vào lòng hầm ở cả hai vách. Mỗi từ giữ glyph đọc xuôi, không phản
chiếu chữ ở vách phải. Atlas được chia theo từ để chiều bố trí theo độ sâu
không đảo nét chữ; nội dung và thứ tự hai câu vẫn giữ. Tâm patch, nhịp cuộn,
camera và hình học đường hầm không đổi. Check logic xác nhận độ sâu đầu/cuối
và hướng glyph; check intro đối chiếu độ sâu, ảnh thuận/ngược và các viewport.
Kiểm chứng: `pnpm run check` PASS; bộ intro PASS desktop/tablet/phone/
landscape/reduced, đã xem ảnh từng chế độ. Bằng chứng ở
`artifacts/intro-reading-direction/`. UI tổng vẫn dừng ở assertion con trỏ
baseline dòng 98; chưa kiểm chứng touch/FPS trên thiết bị thật.

**Mở cổng nhẹ hơn và xoắn đồng bộ, 16/10:** tăng đáp ứng intro lúc mở:
gain 0,60, bước 0,34, lead tối đa 0,52 và tốc độ 1,25; giữ hãm/lùi,
không tự chạy khi ngừng cuộn. Vành, vách và Canvas fallback dùng cùng phase
0,10 rad/s; bỏ lệch tốc độ giữa các lớp. Mép trong cổng blend vào đúng vách
theo camera hiện tại, không dùng lại camera trước khi vào; cổng ra giữ cùng
nhịp dòng vật liệu. Camera hành trình vẫn thẳng và vị trí chữ không đổi.
Showcase: vòng vào rút 1,8s → 1,1s, nghiêng phụ tối đa 0,08 rad. Chuyển động
theo chiều sâu và xoay dùng chung quintic easing; controls hiện xong trong
0,9s. Tổng core passage còn 3,7s. Thoát showcase vẫn không xoay/roll.
Đây là thay đổi theo phản hồi mới, thay các mốc thời gian và shear cũ ở dưới.
Bằng chứng lưu tại `artifacts/portal-open-flow/`.

Kiểm chứng lượt này: `pnpm run check` PASS. Intro/showcase PASS desktop,
phone và reduced; riêng tinh chỉnh feather mép nối sau đó đã chạy lại intro
desktop/phone PASS. Trace vào showcase dài 1.104ms trên cả hai kích thước,
sai số tiến/xoay dưới 1e-12; thoát vẫn yaw/roll 0. Đã xem ảnh mở cổng,
vách, preview và arrival. `check:ui` vẫn dừng ở lỗi con trỏ baseline dòng 98.
Không chạy lại tablet/landscape trong lượt timing này; chưa đo FPS máy thật.
Các report gốc và tổng hợp nằm trong thư mục bằng chứng trên.

**Giữ sáng vách sau khi vào hẳn, 16/10:** vân liquid phải hiện liên tục trước
và sau ngưỡng cổng, khi dừng cuộn và khi quay lại tab. Tạm ẩn phải dừng cả
composition, giữ nguyên frame cuối; không chỉ ngừng shader trong khi canvas
tiếp tục xóa/tô nền đen. Không reset kích thước backing canvas lúc đang ẩn;
đồng bộ kích thước và vẽ ngay khi hiện lại. Chỉ vùng cửa xa đóng kín để
không lộ Home sớm; không làm tối toàn bộ vách. Camera, cuộn, intro aperture
và quy tắc thoát showcase không xoay vẫn giữ. Bộ intro đo pixel trên vùng
vách ở nhiều độ sâu và so frame trước/sau pause; bằng chứng mới nằm trong
`artifacts/intro-wall-visibility/`.

Kiểm chứng: test pause tái hiện FAIL trước sửa. Sau sửa, intro PASS năm chế
độ với đo pixel ở sáu mốc độ sâu/dừng/hồi tab, giữ frame nguyên khi pause.
Lượt bổ sung chống reset canvas lúc hidden/resize đã chạy lại desktop PASS
(`report-desktop.json`); report năm chế độ giữ riêng trong `report.json`.
`pnpm run check` PASS trên source cuối. `check:ui` còn dừng tại lỗi con trỏ
baseline dòng 98. Đã đi vào hẳn ở browser thật và xem ảnh trước/sau pause.

**Chốt tiếp theo 16/10: bỏ xoáy lúc thoát showcase.** Cả chiều tiến và lùi
đều thoát bằng chiều sâu, không tự xoay/roll group màn hình hoặc đường hầm.
Giữ vòng 360° lúc vào, góc nhìn cục bộ do người xem điều khiển, vân liquid,
live preview và camera hành trình. Quy tắc này thay phần xoay lúc ra ở các
ghi nhận lịch sử bên dưới.

Kiểm chứng lượt bỏ xoáy lúc ra: `pnpm run check` PASS; bộ showcase desktop
PASS, trace giữ yaw/roll bằng 0 khi thoát và vẫn đủ một vòng lúc vào. Đã
xem/chụp thoát tiến và lùi thật trong browser (`artifacts/showcase-no-exit-spin/`).
`check:ui` vẫn dừng tại assertion con trỏ baseline dòng 98.

**Ảnh liquid mới nhất, 16/10:** chủ repo yêu cầu sửa họa tiết **cả intro lẫn
showcase**, lấy dòng nước xanh–cam trong ảnh làm gốc. Đây là thay đổi vật liệu:
giữ nguyên camera, mặt phẳng cổng, tốc độ cuộn, chữ trên vách và cách đi/về.
Bỏ lưới, vân xước và sợi xoắn cứng; dùng trường noise mượt cache 64 KiB,
domain advection, nếp nước lớn và caustic phản sáng. UV tuần hoàn quanh ống,
không để đường nối thành mảng tam giác; mép torus feather mềm.
Intro chiếu ray lên đúng bán kính/bend của vách cũ; vortex shear được giới hạn
để không tích thành vòng đồng tâm dày khi đứng lâu. Có Canvas fallback khi
WebGL không khả dụng; renderer/geometry/texture được dọn khi intro unmount.
Showcase dịu lúc đọc và tăng sáng khi qua cổng; giữ hồ quang thưa, hai nối
quang mỗi màn hình, ảnh thật, live iframe duy nhất và reduced motion phẳng.
Bộ kiểm tra cùng ảnh mới lưu ở `artifacts/liquid-tunnels/`; các kết quả phía
dưới là lịch sử của những lượt nâng cấp trước.

**Kiểm chứng bản liquid:** `pnpm run check` PASS. Intro và showcase đều PASS
desktop/tablet/phone/landscape/reduced; đã xem ảnh của cả năm chế độ, cổng mở,
vách, preview và frame chuyển thế giới. Intro kiểm tra cả màu copper/cyan
trên pixel render, chuyển động khi dừng cuộn, chữ vách và lối quay về.
Showcase giữ kiểm tra qua hai phía aperture, iframe nhường chỗ/hồi khi dừng,
native click/input, CV/archive, controls cục bộ và 360° chỉ tại showcase.
`intro/report.json` và `showcase/report.json` nằm trong `liquid-tunnels/`.
Ảnh `actual-boom.png` / `actual-passage.png` dùng phiên web thật, các ảnh live
fixture của bộ test vẫn ghi tên riêng. `check:ui` đã chạy và còn dừng tại
assertion con trỏ baseline dòng 98; không coi đó là PASS toàn bộ UI.
Chưa đo FPS/touch/âm thanh máy thật; build còn cảnh báo chunk >500 kB.

**Phản hồi cổng lượng tử tiếp theo, 16/10:** showcase có chín aperture 3D
nằm giữa các trạm URL, camera thực sự xuyên qua mặt phẳng cổng khi cuộn.
Torus khí xoáy nhiều lớp, halo, sóng năng lượng dọc hầm và hồ quang phân nhánh
bám mép cổng; xung điện có envelope tròn chu kỳ 5,6s, không chớp toàn màn hình.
Màu môi trường blend liên tục giữa hai thế giới, có mốc Không gian 01–09;
mốc này ẩn ở reduced motion để không chồng lên ảnh của bố cục phẳng.
Ở giữa chuyển cảnh, preview/caption/khung nối nhường tầm nhìn và iframe được
dọn; đến nơi tải lại tối đa một live frame. Không dùng crossfade ảnh để thay
cho chuyển động qua cổng. Độ mạnh chuyển cảnh theo cả vị trí lẫn vận tốc:
dừng ở độ sâu lẻ vẫn phục hồi màn hình/live, không ép snap hoặc giữ màn hình
ẩn. Target damping riêng showcase là 5,4; giữ inertia và tính độc lập FPS.
Giữ mặt cong, controls, URL, CV/archive, 360° riêng showcase và camera ngoài
showcase theo hợp đồng cũ. Reduced motion tắt toàn bộ cổng/sóng/điện.
Bỏ các vòng wireframe đều để ưu tiên thể tích khí, tái dùng geometry/texture,
cull cổng xa; dùng clock/cap/pause hiện có. Bằng chứng mới:
`artifacts/showcase-quantum-portals/`. Các kết quả ở dưới thuộc phiên bản trước.

**Kiểm chứng bản cổng lượng tử, 16/10:** `pnpm run check` PASS, gồm độc lập
FPS 30/60/120 và các hợp đồng cũ, TypeScript/build. Bộ showcase PASS cả năm
chế độ desktop/tablet/phone/landscape/reduced; đã xem ảnh chuyển cổng và ảnh
đọc ở các kích thước. Report gốc/tóm tắt trong `showcase-quantum-portals/`.
Sau chỉnh CSS chỉ áp dụng reduced để ẩn mốc bị chồng ảnh, đã chạy lại reduced
PASS; `report-final.json` tổng hợp `report.json` và `report-reduced.json`.
Trace mới xác nhận camera ở cả hai phía mặt phẳng aperture, preview/iframe
nhường chỗ, mốc URL/không gian cập nhật và live phục hồi khi inertia dừng lẻ.
Giữ kiểm tra native click/input, reader pause, CV/archive, đi/về, recovery và
360° chỉ ở showcase. Đã xem Mèo Nổ → Study Cabin → Mèo Nổ trong browser thật.
`check:ui` đã chạy và còn dừng tại assertion con trỏ baseline dòng 98.
Chưa đo FPS/touch/âm thanh thiết bị thật; build còn cảnh báo chunk >500 kB.

**Xác nhận mới nhất ngày 16/10: showcase là đường hầm 3D chứa chín thế giới.**
Mỗi `#/showcase/:id` giữ website gốc riêng; các màn hình nằm dọc độ sâu và
quanh lòng ống WebGL, dùng chung camera với CSS3D. Theo phản hồi tiếp theo,
ảnh gốc uốn theo mặt trụ liên tục bằng 21 dải CSS3D, không thay nguồn ảnh.
Iframe live duy nhất nằm trong biên cong, không nhân iframe hoặc hứa bóp cong
từng pixel DOM; reader tương tác đầy đủ giữ mặt phẳng. Chỉ bên trong
showcase: cuộn tiến/lùi qua các thế giới; kéo chuột nhìn quanh; WASD di chuyển,
R/C lên xuống, Q/E nghiêng, F/nút căn lại phục hồi góc đọc. Touch: dọc để đi,
ngang để nhìn. Shift+kéo giữ lối di chuyển giữa sản phẩm. Chuyển vào/ra giữ
một vòng 360° ở group đường hầm, easing về vận tốc 0, màu dịu theo thế giới.
Camera hành trình, orbit đọc, intro, các chuyến bay và hố đen giữ cơ chế riêng.
Website đang chọn tải live sau khi dừng 420ms; giữ tối đa một iframe preview,
dọn khi đổi sản phẩm, mở reader/trải nghiệm, rời gallery hoặc ẩn tab. Có chuyển
Ảnh/Live, timeout và thử lại; bản tương tác đầy đủ giữ iframe phẳng để hit-test
chuột/phím đúng tọa độ. Reduced motion mặc định ảnh phẳng, tắt xoay; có thể
tự chọn Live. Chỉ website cho phép iframe mới nhúng được; không coi iframe
onLoad là bằng chứng mọi website bên ngoài hỗ trợ nhúng.
Kiểm tra mới: `check-showcase-visibility.mjs`, ảnh/report trong
`artifacts/showcase-world-tunnel/`; fixture HTML động được ghi rõ tên, tách khỏi
ảnh website thật. Kết quả bản nâng cấp trước bên dưới là bằng chứng lịch sử.

**Bổ sung họa tiết/độ cong cùng ngày:** thành ống có vân khí, đường đồng mức,
sợi xoắn và bụi sáng chuyển động chậm. Chín khung cong có 18 nhánh quang nối
vào thành hầm; rim WebGL và ảnh chia sẻ cùng công thức `showcaseScreenPoint`.
Wrapper của màn đang chọn giữ preserve-3d, không filter/opacity làm phẳng các
con; màn xa fade nguyên khối để tránh đường ghép trong suốt. Ẩn lớp glare/SVG
phẳng khi dùng capture cong để tránh giao cắt ở giữa mặt trụ. Nền có clock
riêng khi camera nghỉ, trường nhiễu 8 KiB được cache để tránh tạo hash trên từng
pixel mỗi frame; ambient giới hạn 24 lần vẽ/giây desktop,
18 ở màn hình nhỏ; không vẽ thêm ambient giữa các frame camera đang chuyển
động. Pause khi ẩn tab, mở reader hoặc rời showcase; reduced motion không có
ảnh chia dải, không vẽ ống và không chạy clock. Không thay luật xoay 360° hay
camera ngoài showcase. Bằng chứng mới ở `artifacts/showcase-tunnel-detail/`;
test thêm clock khi nghỉ/pause, khung nối, mặt trụ và nhập liệu native iframe.

**Kiểm chứng bản họa tiết cuối, 16/10:** `pnpm run check` PASS sau khi cache
noise texture và sửa giao cắt các lớp trên mặt cong. Bộ showcase chạy trọn
năm chế độ desktop/tablet/phone/landscape/reduced và PASS; report gốc và tóm
tắt ở `artifacts/showcase-tunnel-detail/report.json`, `report-final.json`.
Đã xem ảnh cả năm chế độ. Bộ test xác nhận 21 dải ở chế độ thường/0 ở reduced,
18 nhánh nối, ambient chạy khi nghỉ và pause trong reader, click/gõ native,
chỉ một live frame, các URL/CV/archive/recovery và hai chiều/360° như trước.
Đã mở web Mèo Nổ thật; `actual-boom-live.png` là ảnh thật, tách khỏi fixture.
`check:ui` đã chạy lại và vẫn dừng ở assertion con trỏ baseline dòng 98,
không ghi bộ tổng PASS. Chưa đo FPS/touch/âm thanh thiết bị thật; build còn
cảnh báo chunk trên 500 kB. Iframe live có silhouette cong, không warp DOM.

**Kiểm chứng bản đường hầm trước bổ sung họa tiết, 16/10:** `pnpm run check` PASS, gồm
TypeScript và production build. Bộ `check-showcase-visibility.mjs` chạy lại
trọn năm chế độ desktop/tablet/phone/landscape/reduced và PASS; bằng chứng ở
`artifacts/showcase-world-tunnel/report.json`, tóm tắt `report-final.json`.
Đã xem ảnh từng kích thước; kiểm tra live HTML động, chuyển Ảnh/Live và dọn
iframe, nhìn quanh/WASD/căn lại, URL, CV/archive, vào/ra thuận-ngược và recovery.
Trace entry/exit xác nhận group quay đủ 360° trong khi camera hành trình giữ
hướng thẳng. Reduced motion ẩn canvas ống, không vẽ shader và không quay.
BeatSync thật đã tải trong browser; ảnh `actual-beatsync-world.png` tách khỏi
fixture QA. `pnpm run check:ui` đã chạy lại, vẫn dừng tại assertion con trỏ
`The default native cursor uses the selected arrow` (`check-ui.mjs:98`);
không ghi bộ tổng PASS. Chưa đo FPS hay xác nhận touch/âm thanh trên máy thật,
và không suy ra mọi website ngoài đều cho nhúng từ kết quả fixture.

**Showcase được bật lại theo yêu cầu nâng cấp ngày 16/10.**
`SHOWCASE_ENABLED = true` trong `src/data/productShowcase.ts`. Sau câu mời cuối
Porrima, wheel/touch/phím đưa vào gallery cong; đi hết tới Skills, lùi trở lại
Porrima. Giữ chín sản phẩm, preview gốc, live preview, mười case study và năm CV.
Gallery dùng nền sao tối, Outfit và liên kết nhẹ cùng portfolio, bỏ sàn phản
chiếu. BeatSync, GameDressUp/Tung Tung, SentinelLAN và Backup ghi phạm vi đóng
góp cùng công nghệ theo CV Full Stack/Software mới; có link CV tương ứng và
archive. Xem [kế hoạch nâng cấp](showcase-upgrade-2026-10-16.vi.md).
Kiểm tra bằng `node scripts/check-showcase-visibility.mjs http://127.0.0.1:5182/`;
ảnh/report ở `artifacts/showcase-upgrade/`. Bộ UI tổng vẫn giữ assertion con trỏ
baseline. Lượt 16/10: `check` PASS; showcase PASS desktop, tablet, phone,
landscape và reduced (nội dung CV, bố cục, đọc/đóng CV và archive, vào/ra hai
chiều, Home/End, Manager và URL sai). Đã xem ảnh desktop/tablet/phone/landscape/
reduced. Tổng hợp ở `artifacts/showcase-upgrade/report-final.json`, giữ các
report từng lượt để đối chiếu. `check:ui` chưa PASS: dừng ở con trỏ baseline;
chạy riêng tablet qua gallery rồi dừng ở assertion cửa ra intro. Không sửa
hoặc bỏ các assertion ngoài phạm vi này; chưa kiểm chứng touch/âm thanh thật.

Cập nhật hình ảnh theo phản hồi mới: plasma đối lưu và vòng lửa nằm trên
bề mặt sao; vật liệu được cache, thời gian ambient dừng ở reduced motion.
Các vòng plasma không phải đường trắng thường trực: trào từ bề mặt trong
3–4,4 giây, tan hẳn rồi nghỉ hơn nửa chu kỳ 8–12 giây. Mỗi vòng lệch pha,
khí có mật độ mềm và giữ màu sao; điểm nóng chỉ sáng trong đợt trào. Reduced
motion bỏ các đợt phun, không để lại dây tĩnh. `check-stellar-ui.mjs` lấy mẫu
12 giây trên mỗi viewport, chụp lúc trào/lúc nghỉ và kiểm tra từng vòng tắt hẳn.
Theo phản hồi mới nhất, đã bỏ hoàn toàn vụ nổ trước Contact, shader/ejecta
và nhánh làm lõi sao cuối tan sớm. Vindemiatrix giữ bề mặt plasma xanh có
vân rõ, quầng sáng nhỏ và nhẹ hơn; chỉ mờ cùng hệ sao khi bay rời trạm.
Cảnh nổ ngẫu nhiên bên đường cũng được thay bằng bụi sao, không khôi phục
chớp nổ. Không sửa BlackHoleVortex, blackHoleShader, blackHoleRendering hoặc
BlackHoleOrbitControls; không đổi camera, độ dài cuộn hoặc pacing.

Theo phản hồi về nét trắng dư: bỏ lớp FlightTrails quanh camera và đuôi sao
băng dạng lineSegments. Biến thể sao băng chỉ dùng 2–5 đốm glow xanh dịu,
không dựng các đoạn trắng cứng trên hệ sao. Giữ chuyển động vật thể/bụi,
đường quỹ đạo, chòm sao và plasma; không đổi đường bay để bù hiệu ứng.
Chế độ `TRANSIT_CHECK=scenery` của `check-transit-ui.mjs` chụp ba cảnh ở
năm mốc thuận/ngược trên desktop/phone. Dùng để xem bố cục nhanh; kiểm tra
chuyển động liên tục vẫn dùng lệnh đầy đủ trong quy tắc bay thẳng.

Chữ intro xuất hiện trên thành trái trước, thành phải sau; luôn một dòng,
có sẵn từ xa và sáng dần bằng ion scan/wave light. Các cặp câu đọc cũng
trái → phải; wipe, focus, word cascade và rise đều lấy cùng tiến độ cuộn,
không timer/autoplay. Reduced motion hiển thị ink rõ ngay. Lòng hầm dùng
vân liquid tới tâm; theo chốt mới không vẽ sương/đĩa đen phủ điểm tụ.
Home vẫn được che đến đoạn cửa ra dưới 650 đơn vị.
Mở cổng dùng độ nhạy 32% so với lúc bay, giới hạn mỗi input 0,16 đơn vị,
đích cuộn chỉ dẫn trước 0,22 và tốc độ mở tối đa 0,7 đơn vị/giây. Từ 2,75
đến 4,4 các giới hạn tăng liên tục về nhịp bay hiện có. Cuộn nhẹ phải mở ít,
đợt wheel dồn không được đẩy thẳng vào hầm; dừng tay dừng tiến, lùi hủy đích
xuôi ngay. Wheel/touch/phím cùng dùng một hàm; reduced motion giữ lối tắt.
Đã kiểm tra cuộn 12px, 8 nhịp wheel dồn, dừng tay và quay về chòm sao trên
cả 5 viewport trong `check-intro-ui.mjs`; xem ảnh `*-gentle-opening.png`.

Email, GitHub, LinkedIn, Web CV và Mobile CV giữ hiển thị/khả năng focus từ
khi tới Contact đến vị trí 6, độc lập câu dẫn. Footer màn rộng chừa khoảng
giữa cho nút workspace, giữ renderer và điều khiển hố đen. Kiểm tra shader,
ảnh plasma đang sôi, bề mặt sao cuối, thứ tự chữ và Contact trên desktop,
phone, landscape, reduced bằng
`node scripts/check-stellar-ui.mjs http://127.0.0.1:5182/`;
ảnh/report ở `artifacts/stellar-effects/`.

Bản bỏ vụ nổ đã PASS `check`, ảnh sao cuối/Contact trên 4 chế độ và 12 lượt
chuyển trạm thuận/ngược desktop/phone. Đã xem ảnh sao cuối khi đọc và khi rời
trạm; bốn file hố đen và thân PortalGate giữ nguyên. UI tổng vẫn dừng ở assertion
con trỏ baseline như ghi ở phần giới hạn bên dưới; chưa đo FPS trên máy thật.

| Luồng | Hành vi cần giữ | Kiểm tra |
| --- | --- | --- |
| Mở trang | Bộ tải dạng sóng, tiến trình dễ đọc; reduced motion bỏ thời gian chờ; dọn timer/listener khi rời trang | `check:experience`, `check:ui` |
| Cổng vòng xoáy và hầm khí (15/10/2026) | Cổng xuất hiện tại sao trung tâm; các dải khí quay theo vận tốc góc khác nhau, chòm sao và các đường nối bị vặn theo cùng trường lực. Cổng đạt kích thước vật lý tối đa rồi giữ nguyên; camera tiến qua mặt phẳng cửa tại z=500. Lưới 18×20 chỉ là hệ tọa độ ẩn, không vẽ wireframe. Khí và vệt sáng đi theo đường xoắn trên thành; mỗi câu là một dòng cố định dọc trục bay, không quấn quanh miệng hầm và không bật chữ theo timer. Cửa ra tại z=-4400 mở xuyên tới cảnh Home thật; camera Home tiến cùng độ sâu cửa, không dừng để fade toàn màn. Cuộn quyết định vị trí, dừng cuộn dừng tiến; viền khí vẫn quay. Giữ mute, reduced motion, hủy route, dừng tab ẩn và cuộn ngược có chủ ý ở Home. | Hình học cổng cố định, tốc độ quay khác nhau, chữ dọc trục và camera xuyên cửa trong check:experience; ảnh viền quay khi đứng yên, cửa vào/ra, nền Home thật và chiều về trên 5 viewport trong check-intro-ui.mjs |
| Hành trình Virgo | Hiện từng câu theo scroll; góc nhìn quanh sao quay 180° khi đọc qua phép đổi hệ tọa độ cục bộ, mesh/label cùng quay. Camera tuyến bay luôn nhìn -Z, X/Y cố định; góc sao rời đi giữ nguyên, không unwind trước khi bay. Chữ đổi vị trí; cuộn ngược khôi phục góc/độ sâu/câu trước | `check:portfolio`, `check:experience`, `check-scroll-ui.mjs`, pose/câu thực trong `check:ui` và `check-transit-ui.mjs` |
| Đường hầm thế giới | Ống WebGL chung camera với chín cửa sổ theo độ sâu/vị trí khác nhau, mỗi thế giới có hash/website riêng. Ảnh gốc uốn 21 dải CSS3D theo mặt trụ; iframe live duy nhất nằm trong silhouette cong. Khung cong có hai nhánh nối thành ống. Vân khí, sợi xoắn và bụi dùng ambient clock có cap 24/18, pause khi ẩn/reader/reduced. Giữ Outfit, preview gốc, crop scrollbar của ba app, HUD 44px, tự vào sau Porrima, nối Web → Apps, qua cuối tới Skills và lùi về Porrima | `check:experience`, không gian/look/WASD/căn lại, mặt cong/clock/pause, click/input native, live DOM, bố cục và hai chiều trong `check-showcase-visibility.mjs`; hồi quy `check:ui` |
| Bay giữa các trạm | Giữ đường thẳng theo video 17-42-22: không yaw/pitch/roll, không bay vòng hay reset hướng. Sao băng, thiên thạch và bụi sao thay đổi cảnh quanh đường bay; xáo thứ tự một lần mỗi hành trình, lùi giữ cùng cảnh. Không phủ xanh đục. Cuộn ngược đi lại cùng đường. Tốc độ đọc/bay nối liên tục; URL về Home/Cosmos nhảy trực tiếp. Hố đen xuất hiện từ xa trong Skills → Contact; vào workspace tiếp tục cùng trục | Đường thẳng/độ sâu hai chiều và lựa chọn cảnh trong `check:experience`; camera thực, ba cảnh và ba đoạn hai chiều desktop/phone trong `check-transit-ui.mjs`; pose/ảnh tiếp cận và workspace trong `check:ui` |
| Điều khiển showcase | Wheel ngang/dọc và Shift+kéo đi giữa thế giới; kéo chuột nhìn quanh; WASD di chuyển XYZ, R/C lên xuống, Q/E nghiêng, F/nút căn lại. Touch dọc đi, ngang nhìn. Mũi tên và Home/End giữ chọn thế giới; không remount khi đổi sản phẩm. Reduced motion dùng mặt phẳng và kéo/cuộn cũ | `check:experience`, `check-showcase-visibility.mjs`, `check:ui` |
| Vào/ra showcase | Câu trái “Each project…” rồi câu mời “Step into…” bên phải. Camera hành trình chuẩn bị 1,5s rồi bay thẳng xuyên lõi trong 1,1s, roll=0; flash qua điểm nối renderer. Sau 2,6s mount showcase; group đường hầm xoay 360° trong 1,8s rồi mở điều khiển. Ra dùng 1,4s, quay ngược theo chiều đi rồi nối cảnh cũ. Chỉ group/camera cục bộ showcase có chuyển động mới; reduced bỏ chờ và xoay, đổi route hủy passage | `check:ui`, `check-showcase-visibility.mjs` đo heading hành trình, transform đường hầm và luồng thuận/ngược |
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

Sửa chuyển trạm theo video ngày 15/10: bỏ `virgo-transit-veil` và đường bay
cong. Giữ orbit lúc đọc theo xác nhận sau đó, qua phép quay hệ tọa độ quanh sao.
Camera tuyến bay giữ X/Y=0 và quaternion (0,0,0,1), không cần reset hướng.
`node scripts/check-transit-ui.mjs http://127.0.0.1:5182/` đo camera thực trên
desktop 1242×715 và phone, ba đoạn bay cả hai chiều cùng các pose đọc; kiểm tra
cảnh nền ổn định và lưu ảnh trong `artifacts/transit-motion/`.

Khi chưa mở cổng, intro nối sao bắt đầu từ sao vàng trung tâm (index 1), lan đồng thời qua
năm nhánh rồi nối đủ 14 sao và 16 cạnh trong 4,9 giây sau loader. Camera
đứng yên trong lúc nối; thao tác bắt đầu sớm được chờ đến khi nối xong.
Nét nối Canvas rộng 0,45px, alpha 0,34. Khi cổng mở, sao và nét nối cùng
chịu lực vặn; đóng cổng trả về bố cục ban đầu.
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
Các hệ sao trở về cùng trục Z theo video tham chiếu; đường bay và hướng nhìn
luôn thẳng giữa các trạm, lùi đi cùng đường và không có lớp che đục. Wheel dùng delta thật với lead
0,16 viewport, mỗi sự kiện tối đa 0,12 viewport, bỏ hàng đợi cũ khi đổi chiều.
Gallery bắt đầu sau câu cuối. Các kiểm tra tương ứng nằm trong
check-intro-ui.mjs, check-transit-ui.mjs và check-black-hole-ui.mjs.

Mỗi nhịp cuộn có thay đổi độ sâu: nội suy Hermite đơn điệu nối vận tốc tại
các mốc thay cho smoothstep dừng ở từng mốc. Đoạn 5→6 rút từ 300vh xuống
160vh, pacing bay cuối từ 3,4s xuống 1,8s; Contact cuối là 100vh để hết cuộn
đúng lúc tới đích, bỏ đuôi trống 140vh. Intro giữ tâm/cửa xa đen kín đến khi
độ sâu cửa dưới 650; Home được chuẩn bị phía sau nhưng chưa nhìn thấy lúc
vừa vào hầm. Đảo chiều intro hủy vận tốc còn dư ngay frame đầu.

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
- Liên kết Contact nằm ở footer trống, email/CV dưới đĩa từ lúc đến tới vị trí 6;
  không khôi phục câu dẫn đã gỡ khỏi hố đen.
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
Giữ trạm và hướng nhìn thẳng hiện có; lúc flash, showcase dùng không gian cục bộ
riêng với các thế giới dọc đường hầm. Tỷ lệ hình học lấy từ viewport để giữ
preview 16:9. Hai renderer nối bằng flash #FFF8E7; sao #F4A261,
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
Quy tắc bay thẳng theo video 17-42-22 đã được kiểm tra trên camera thực:
ba đoạn bay hai chiều, ba cảnh nền, pose đọc và toàn bộ đoạn vào gallery trên
desktop/phone đều PASS; góc xoay giữa các frame chuyển trạm đo được bằng 0.
Ảnh bố cục đọc, cảnh nền và cửa ra Home đã được xem lại.
Sau xác nhận “xoay lúc đọc, bay thẳng khi chuyển trạm”: `check-scroll-ui.mjs`
PASS 84 nhịp wheel nhỏ hai chiều trên desktop/phone/reduced, đổi chiều khi
chưa hết lead, orbit đọc 180° (reduced tắt orbit) và đuôi cuộn Contact = 0px.
Intro được kiểm tra lại 5 chế độ; 4 chế độ có animation giữ pixel tâm đen kín
lúc vào/đọc/gần cửa, rồi mở trong đoạn cuối; reduced chuyển ngay theo input.
Đã xem ảnh đọc thuận/ngược, tâm hầm kín và cửa mở sau khi chỉnh mép tối.
Bản plasma/siêu tân tinh cũ (trước yêu cầu bỏ vụ nổ) và bố cục trái trước đã PASS `check`, VFX trên
desktop/phone/landscape/reduced, intro 5 viewport, 84 nhịp wheel nhỏ và ba
đoạn bay hai chiều. Đã xem ảnh plasma trước/sau, sóng nổ, chữ trên thành trái,
footer và màn hình ngang. VFX report ghi hash nguồn và từ chối PASS nếu nguồn
đổi trong lượt chạy. Bốn file hố đen và thân hàm PortalGate đã được đối chiếu
với bản trước và không thay đổi. Những kiểm tra này không phải phép đo FPS thật.
`check:ui` tổng dừng ở assertion con trỏ custom (CSS baseline đang dùng con
trỏ hệ thống). Lần đối chiếu trước quy tắc bay thẳng: tablet qua intro/gallery/orbit/transit nhưng dừng
ở ngưỡng pixel vùng tối hố đen. Đã chạy lại mã HEAD gốc qua máy chủ đối chiếu,
không đổi working tree, và gặp cùng lỗi hố đen; báo cáo ở
`artifacts/feature-preservation/baseline/`. Giữ nguyên các assertion này,
không coi bộ UI tổng là PASS.
