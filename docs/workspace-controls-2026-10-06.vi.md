# Điều khiển workspace — 6 October 2026

## Trải nghiệm đã triển khai

| Thao tác | Chuột / bàn phím | Touch / bút |
|---|---|---|
| Nhìn quanh | Kéo scene hoặc phím mũi tên; Explore dùng mouse look | Kéo một ngón trong scene; tilt tùy chọn |
| Di chuyển | WASD khi canvas được focus hoặc đang Explore | Cần di chuyển ở góc trái, kéo vùng scene để nhìn bằng ngón khác |
| Mở nội dung | Click vật thể; trong Explore có click / E | Chạm vật thể hoặc ngắm tâm nhìn rồi nhấn Open |
| Đi đến đồ vật | Mở Contents → Room viewpoints; màn hình chính không có thanh vị trí | Thanh Desk / Room / Library / Resume / Contact, các nút tối thiểu 44 px |
| Dừng / quay về | Thả phím, Escape thoát Explore; reader trả lại vị trí và góc nhìn | Thả cần; Reset đưa về vị trí đã chọn; reader trả lại góc cũ |

Auto nhận loại pointer thật khi người dùng thao tác, không suy luận chỉ từ chiều rộng màn hình. Touch và pen được xử lý chung; thiết bị hybrid có thể đổi giữa hai UI. Settings có lựa chọn Auto / Touch / Mouse để chủ động chọn điều khiển.

UI chuột được rút gọn sau phản hồi: trên cảnh chỉ còn Portfolio, Contents và Explore. Room controls, Settings và các góc nhìn nằm trong Contents. Cần Move, Open card và Tilt chỉ có ở Touch.

Vùng đi lại x=[7,16], z=[-15,14], nằm ngoài bàn (x tối đa khoảng 5.86) và tủ sách (x tối đa khoảng 3.27) trong nguồn GLB. Tốc độ 3.2 đơn vị mô hình mỗi giây, hướng chéo không nhanh hơn hướng thẳng. Delta sau tab ẩn được giới hạn 50 ms. Đây là vùng quan sát 3D có giới hạn, không phải bộ vật lý đi bộ toàn căn phòng.

## Kích thước, camera và phản hồi

- Desk desktop: [7.5,10.5,0.85], portrait: [9.5,11.4,0.85]. FOV ngang 54°, dọc 65°. Bàn phím, giấy CV và màn hình dễ nhận diện hơn góc cũ.
- Room lùi về x=14 (portrait x=16) để quan sát rộng. Library nhìn từ [9.5,7.8,-0.5] về tâm tủ để thấy gáy sách. Resume/Contact nhìn về anchor tương ứng từ lối trống.
- Chuyển vị trí 600 ms với chuột, 400 ms với touch, easing smoothstep. Reduced motion chuyển ngay; cần di chuyển vẫn hoạt động theo thao tác chủ động.
- Khi xoay màn hình, góc preset được căn lại; góc tự di chuyển được giữ. Vị trí/quaternion được lưu khi đổi tier GLB và khi reader mở/đóng.
- Chuột: click <=500 ms, lệch <=6 px. Touch/pen: tap <=450 ms, lệch <=12 px. Chỉ xoay camera sau ngưỡng kéo. Drag, hold, pointercancel và pointer thứ hai không mở nội dung.
- Touch có aim assist bốn tia lệch 10 px khi tia chạm chính không chọn được; mỗi tia vẫn kiểm tra bề mặt che khuất. Aim ở tâm cập nhật 10 lần/giây và cần ổn định 120 ms trước khi bật nút Open.
- Cần di chuyển 104 px, thumb 44 px; landscape pad 80 px. Nút Open 210×68 px ở portrait, landscape 200×54 px. Safe-area được giữ. Landscape đưa hai cụm điều khiển ra hai bên, không đặt vào giữa cảnh.
- Nút nhấn phản hồi 100–140 ms; label giới thiệu hiện ngắn lúc vào phòng. Touch dùng Open card thay cho label hover thường trực. Âm thanh vẫn opt-in, dùng cue hiện có; không thêm tiếng bước chân hoặc autoplay.

## Kiểm tra

`check:experience` bổ sung kiểm tra mouse/touch tap, long press, mất pointer, camera preset trong vùng an toàn, tốc độ chéo, dừng khi release và tab resume không nhảy vị trí. Các hash/anchor/budget của GLB và 39 frame GIF vẫn qua kiểm tra. `check:portfolio` và build PASS; cảnh báo chunk lớn đã có từ trước.

Browser kiểm tra UI chuột desktop, Touch thông qua lựa chọn trong Settings ở 390×844 và 844×390, chuyển vị trí, cần di chuyển rồi thả, phím W, Open Resume và trả về vị trí cũ. Chuyển high → low tại Contact vẫn giữ nguyên [7.5,9.6,6.2]. Ảnh và dữ liệu trong `docs/qa/controls-2026-10-06/`.

Sau khi rút gọn desktop: kiểm tra Contents → Library đưa camera tới [9.5,7.8,-0.5], Contents → Settings mở đúng panel. Chế độ chuột chỉ có ba nút trên cảnh; chế độ Touch tại 390×844 vẫn có thanh góc nhìn, Move, Open và Tilt. Build và check:experience PASS; không có lỗi console trong phiên kiểm tra.

Trình xem trong Codex không cho pointer lock: đã kiểm tra fallback kéo + WASD. Cần thử mouse lock, multitouch hai ngón đồng thời và cảm biến trên thiết bị thật để xác minh trải nghiệm phần cứng; ảnh viewport không chứng nhận các thao tác đó hoặc FPS trên điện thoại.
