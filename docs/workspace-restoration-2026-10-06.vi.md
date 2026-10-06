# Khôi phục workspace — 6 October 2026

Phản hồi người dùng: màn hình mất GIF và workspace giảm chất lượng thị giác.

## Nguyên nhân và sửa
- SVG tĩnh đã thay GIF trong đợt tối ưu. Khôi phục `public/img/screenDesktop.gif` gốc ở cả ba tier. SVG chỉ còn fallback khi tải/decode GIF thất bại.
- Thiếu environment reflection làm vật liệu tối/phẳng. Thêm PMREM ánh sáng được tạo cục bộ, chỉnh ambient về 0.45, reflection intensity 0.4. Không cần tải HDR từ dịch vụ ngoài.
- Bỏ khung chọn Box3 dạng hộp kỹ thuật; vẫn có nhãn đồ vật và reticle khi khám phá.
- Camera portrait lùi về [8.5,10.5,0.5], nhìn về [-3.86,8.5,0.85], để thấy trọn màn hình và bàn. Desktop giữ góc ban đầu.
- Auto-quality yêu cầu ít nhất 60 mẫu trong cửa sổ đánh giá; preview/tab bị throttle không được dùng vài khung hình để tự hạ đồ họa.

## Animation và tài nguyên
GIF gốc 480×270, 39 frame, khoảng 15 fps. Chỉ giữ một buffer RGBA 518400 bytes, giữ timing GIF và compositing nguyên bản, không tạo 39 canvas/texture. Texture chỉ upload khi đổi frame. Pause khi mở reader/OS, tab ẩn hoặc reduced motion; không decode/upload nếu màn hình ngoài frustum. PMREM 128px tạo một lần và dispose khi rời scene; giữ shadow map high 1024px. GLB gốc và các tier không thay đổi.

## Kiểm tra
- check:experience PASS, bổ sung so sánh cả 39 frame với GifReader, kiểm tra vòng lặp và không upload lại cùng frame.
- check:portfolio PASS.
- build và diff --check PASS; còn cảnh báo chunk lớn đã tồn tại.
- Browser desktop 1440×900, portrait 390×844: GIF hiện, ảnh ở hai thời điểm khác nhau; Contents → Zney OS → quay lại; click trực tiếp vùng màn hình → Zney OS thành công.
- Ảnh trong docs/qa/workspace-2026-10-06: before-desktop, after-desktop, after-phone; gif-frame-a dùng đối chiếu chuyển động (khác thời điểm).

Không dùng ảnh mô phỏng để chứng nhận FPS/gyro trên điện thoại thật. Cải thiện này khôi phục các phần bị mất; đánh giá thẩm mỹ cuối cùng dựa trên trải nghiệm và phản hồi người dùng.
