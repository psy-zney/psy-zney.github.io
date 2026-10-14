# Kiểm tra bản build ngày 13/10/2026

`pnpm run check` và `pnpm run check:ui` đều PASS. Browser check dùng Chrome
headless ở 1440×900, 390×844, 844×390 và reduced motion. Báo cáo máy đọc được
và ảnh nằm trong `artifacts/feature-preservation/`.

| Phần sửa | Trước | Sau |
| --- | --- | --- |
| Manager | Mảnh màn hình che placeholder giữa khung | Bỏ toàn bộ icon/tên/placeholder giữa màn hình; tên và link nằm dưới khung |
| Góc nhìn | Dao động ngang/dọc nhẹ | Camera đi nửa vòng 180° thật, hai góc đọc cách nhau 180°; cuộn ngược khôi phục pose |
| Câu chữ | Hai câu cùng vị trí | Mỗi câu xuất hiện riêng ở góc đọc; đổi từ trên/trái sang dưới/phải, có bố cục phone/landscape |
| Showcase trong hành trình | Chỉ mở khi bấm link | Cuộn sau Porrima tự mở gallery, cuộn hết tiếp tục Skills và cuộn ngược trở về được |
| Kích thước showcase | Khung nhỏ, có nút X thoát | Preview lớn hơn ở desktop/phone/landscape, bỏ nút X; ra/vào bằng cuộn theo flow |
| Chuyển cảnh showcase | Hiệu ứng chỉ bắt đầu sau khi gallery mở | Có đoạn dẫn trên cảnh vũ trụ trước hash/gallery: camera tiến vào, chữ mờ, khung sáng mở rộng; thu khung khi rời; reduced motion chuyển ngay |
| Con trỏ | Mũi tên/bàn tay mặc định | Cặp Deep Space Gradient gốc, tải từ file local; giữ con trỏ nhập chữ và pointer lock |
| Hai nhóm sản phẩm | Cần bấm Web/Downloads; cuộn bị chặn ở ranh giới | Web experiences → Apps & tools nối liên tục, có ánh sáng chuyển phần; cuộn ngược trở lại được |
| Nhãn ứng dụng | Downloads / View downloads | Apps & tools / Explore app; bản tiếng Việt dùng Ứng dụng & công cụ / Khám phá ứng dụng |
| Gallery | Phím mũi tên không tới đích; đổi sản phẩm remount; vệt nối/glow giữa màn hình | Giữ đích điều hướng, giữ instance/focus, chuyển động theo frame rate, bỏ mặt glow gây vệt giữa |
| Bố cục | Gợi ý cuộn, chữ, selector và nút có thể chồng nhau | Kiểm tra vị trí thực trong browser, vùng bấm 44px và bố cục phone/landscape riêng |
| Hố đen | Lệch trái desktop, mảng sáng trong lõi không khớp đĩa ngoài | Căn giữa cả ngang/dọc trên desktop, bỏ mảng trong lõi, giữ bóng tròn và vòng ánh sáng; đo vị trí và tỷ lệ lõi từ ảnh browser |
| Kiểm tra | Các tính năng mới không được guard trong lệnh cũ | `check:experience` gọi check mới; AGENTS/GEMINI ghi baseline; CI kiểm tra trước build/upload |

Đã thử: điều hướng bằng phím, Home/End, chọn nhóm, kéo pointer, wheel ngang
và dọc xuyên nhóm thuận/ngược, touch swipe mô phỏng, live dialog với fixture,
đóng case study trở về đúng sản phẩm, hash sai, ảnh bị chặn tải, mute và đi
qua hố đen vào workspace. Không ghi nhận lỗi runtime/shader trong bốn lượt.

Manager chưa có ảnh preview thật trong baseline; trạng thái thiếu preview
dành cho screen reader, không tạo ảnh giả. Live iframe dùng fixture nên chưa xác
nhận website bên ngoài cho nhúng. Touch vật lý và cảm giác âm thanh cần thử
trên thiết bị thật. Build còn cảnh báo chunk Three.js lớn đã có từ trước.
