# Hướng nâng cấp hình ảnh, 20/10/2026

Chốt tiếp theo: nền chính là cầu vũ trụ của main.glb, tách bằng Blender;
đứng ở tâm nhìn 360°. Intro có nút Start liquid glass, tên Newsreader gõ dần
và đoạn giới thiệu ngắn. Chỉ nguồn video gốc đã xác minh mới được dùng;
URL đang trống vì Browser bị tắt. Không phát bản quay màn hình.
Các trạm giữ nền main, bề mặt sao có vi hạt sáng và plasma. Showcase giữ
preview thật, chọn theo ngang, cuộn dọc tới Contact với chân trời minh họa
riêng và đường dẫn thật. Nhạc/SFX dùng chung mute, hidden và ducking.
Chi tiết hiện hành và giới hạn kiểm tra nằm ở đầu feature-preservation.vi.md.
Các mô tả hầm cũ dưới đây là lịch sử thiết kế.

Chốt hiện hành theo 10 đánh dấu Browser: kéo/vuốt ngang nhìn 360° trong
universe, các thiên hà quay độc lập; cuộn vào hầm lên/xuống rồi đến Home.
Hố đen có khúc xạ nền, Contact chỉ trượt xuống showcase. Bộ điều hướng
nằm giữa đáy viewport, Back chỉ mũi tên; nền ít sao hơn và tinh vân trầm
ở mép. Sao dùng đối lưu rộng và vi hạt nhẹ, bỏ cảm giác nhiễu trắng.
Chốt này thay vị trí hầm showcase trong bản kế hoạch trước bên dưới.

Chốt cập nhật sau clip Bilal: intro universe theo ảnh Behfar, tên ở vùng
yên giữa sao sáng và các đĩa thiên hà nghiêng quay độc lập; cuộn trượt xuống
Home. Riêng Contact→showcase dùng hầm xanh trắng: vách khí 3D liên tục,
nếp gấp tối và vùng khí phát sáng mạnh, lõi sâu và cửa thoát hữu hạn. Dùng
atlas nebula local hiện có kết hợp geometry/noise, không dùng clip làm nền.
Camera hầm tiến thẳng; camera Virgo và orbit đọc giữ nguyên. Chốt này thay
phần giữ intro plasma ở đoạn cuối tài liệu.

- Màu: nền sâu `#020408`, khí xanh `#243b56`, ánh sao `#efb575`,
  bề mặt lạnh `#8eaaca`, chữ ngà `#ede9e2`, chữ phụ `#aab7c8`.
- Chữ: Newsreader cho lời kể, Outfit cho điều hướng và nội dung sản phẩm.
- Bố cục: lời kể ở vùng yên; thiên thể và tiền cảnh giữ cảm giác quy mô;
  showcase đặt ảnh thật bên trái, nội dung và lối vào bên phải trên desktop.
- Chuyển động: tự quay, quỹ đạo, khí và bụi có nhịp riêng. Cuộn chỉ điều khiển
  hành trình và orbit đọc; không thêm chuyển động tự động cho camera.
- Chi tiết: ánh sáng có hướng, bề mặt có cấu trúc, mây ở lớp riêng, tiền cảnh
  che khuất đúng chiều sâu; hover/focus/nhấn rõ và thống nhất.
- Giới hạn: reduced motion dừng ambient; hidden/dialog dừng clock; không dùng
  video nền phẳng thay cho không gian 3D. Không thay GLB hoặc preview của chủ repo.

Ưu tiên sự sống của không gian bằng chuyển động có nguyên nhân và độ sâu thật.
Giữ intro plasma và tuyến bay đã được chốt, thay vì thay toàn bộ bằng hero mẫu.
