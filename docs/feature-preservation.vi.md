# Tính năng hiện hành và cách kiểm chứng

Cập nhật 22/10/2026. Đây là bản đồ hành vi đang dùng, không phải mẫu thiết kế
bất biến. Yêu cầu mới của chủ repo được ưu tiên. Có thể mở rộng nội dung,
đổi bố cục, màu, animation và cách trình bày; cập nhật kiểm tra theo hành vi
mới, không giữ các giới hạn số câu, số dòng hoặc mẫu ảnh từng bị chê.

## Luồng công khai

- Intro có tên Lê Quang Khánh, Galaxy React Bits và nền lấy từ main.glb gốc.
  Kéo/vuốt ngang xoay nền; Home/nhấp đúp đặt lại. Start chủ động vào Home,
  Escape có thể hủy entry. Không dùng ảnh/video giả thay tài nguyên gốc.
- Home giới thiệu ngắn. About hiện sẵn học vấn và kinh nghiệm cá nhân,
  freelance, nhóm; phần mở rộng mô tả cách học và CV.
- Projects và More projects nối 10 hồ sơ dự án xác minh. Skills giữ năm
  nhóm tương tác; Delivery nói riêng về xác minh dữ liệu, quyền và bàn giao.
- Continue đi lần lượt 2.12 → 3.23 → 3.95 → 4.92 → 5.17 → Contact 6.
  Destinations cho phép chọn trực tiếp, Escape/outside click đóng menu.
- Camera chuyển trạm giữ trục XYZ, orbit đọc riêng; xem straight-flight-contract.vi.md.
  Từ 5.30, wheel xuống dùng gain 2.4 để bớt ba nhịp chuẩn 120px;
  wheel ngược, native touch và bàn phím giữ cách điều khiển cũ.
- Contact tại hố đen giữ email, GitHub, LinkedIn và CV. Kéo/arrow xoay góc
  nhìn hố đen; Home/nhấp đúp đặt lại, cancel không để capture kẹt.

## Showcase và chuyển cảnh

- Một thao tác chủ động sau Contact mở đoạn dẫn có ba preview gốc, trạng
  thái ảnh load/error thực; ảnh lỗi không chặn vào. Chuyển DOM dọc 1.65s,
  camera đứng yên; Escape/cuộn ngược quay cùng progress. Reduced motion đi ngay.
- Chín sản phẩm, ảnh/đích thật trong productShowcase.ts. Motion spring điều
  khiển một dải ngang; nhận offset tay khi nhả, không snap ngược. Nút trước/
  sau, ngang wheel, swipe và bàn phím giữ biên không loop.
- Desktop rộng dùng composition hai vùng. Dưới 1000px, ảnh → phạm vi → nội
  dung → hành động → điều hướng đều trong flow; nav không sticky đè nút.
  Chiều cao rail theo slide hiện tại. Wheel dọc đọc, swipe ngang chọn dự án.
- Enter world mở gallery, đóng trở về đúng dự án. Các link website/app,
  case study, CV và live preview giữ đúng đích. Native iframe nhận click,
  gõ phím và cuộn riêng; có đóng, loading và lỗi/khôi phục.
- Cuối showcase là trang liên hệ kính tối với lời mời cụ thể, email/copy,
  GitHub, LinkedIn, CV và Back to universe. Copy có phản hồi thành công/lỗi.
  Chuyển động tuyến tín hiệu dừng khi ẩn và tắt trong reduced motion.

## Tài liệu và CV

- Public project/archive, workspace reader và Zney OS giữ route trực tiếp,
  nội dung gốc, phần mục lục, copy, close/Escape và đường quay lại.
- Archive hiện công dụng/công nghệ; mở thêm vai trò/bài toán, rồi case study.
  Desktop hover, touch/click ghim; một card mở tại một thời điểm.
- Ba CV mới Backend/Full Stack/Software là HTML đầy đủ, A4 trắng,
  Times New Roman, CSS trong iframe sandbox. Giữ bản nguồn và SHA manifest.
  Tabs, Contents, Print / Save PDF, menu More tải HTML/bản gốc đều hoạt động.
  Alias web/game/mobile cũ vẫn phục hồi đúng CV. Không biến HTML thành Markdown.
- Không tự thêm thành tích, chức danh, nguồn ảnh hoặc đường tải sản phẩm.
  Nguồn nội dung ở portfolio-content-sources.md; preview ở product-preview-sources.md.

## Workspace

- Giữ GLB phòng gốc, textures, baked lighting, vị trí vật thể và vùng đi lại.
  Chạm/click giấy, kệ sách, thẻ và màn hình mở CV, library, Contact và Zney OS.
- Contents và các route tài liệu hoạt động ngay cả khi renderer lỗi/chậm.
  Retry, room controls, viewpoints, mouse/WASD/touch, reset/tilt, đồ họa,
  âm lượng và sound vẫn có chức năng tương ứng. Quyền cảm biến theo thiết bị.
- Library có search, lọc năm nhóm, sort, grid/list, empty state và clear.
- Zney OS có Home, Projects, Documents, Contact, Playground, Settings;
  More trên mobile, Back to room, Escape, scroll/focus hồi phục.
- Playground giữ bàn phím, LED, paw, radar game, hướng di chuyển/dash và sound.
  Admin riêng có login/refresh/logout/back; không đưa dữ liệu riêng vào test.

## Âm thanh, chất lượng và nguồn

- Giữ gesture unlock/retry, mute chung, nhạc ambient có hai stem cùng
  playhead, SFX giới hạn/deduplicate, wheel oscillator tái dùng. Worker
  tổng hợp có fallback; hidden/mute không phát bù cue. Workspace có bus riêng.
- Giữ nguồn assets và attribution. LICENSE.md trong vendor React Bits là
  nghĩa vụ giấy phép, không phải tài liệu thiết kế cũ để xóa.
- Chất lượng tự thích ứng và renderer recovery; không suy ra FPS/cảm giác
  touch/âm thanh từ static tests hoặc giả lập trình duyệt.

## Kiểm tra

- `pnpm run check`: dữ liệu, route, nguồn, toán học, lifecycle, TypeScript/build.
- `pnpm run check:ui`: gallery/journey/hố đen/passage và thao tác thuận/ngược.
- `pnpm run check:audit`: mọi hồ sơ, CV, nút theo nhóm, workspace/OS/admin fixture.
- Script UI chuyên biệt còn lại bao phủ intro, rail mobile, chuyển động,
  popup, CV, nội dung, đoạn dẫn, audio và native iframe.
- Bằng chứng mới ở artifacts/final-audit/ (gitignored). Báo cáo PASS phải
  thuộc cùng nguồn hiện tại; ghi rõ thất bại và giới hạn thử nghiệm.
