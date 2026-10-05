# Review triển khai — 5 October 2026

## Kết luận
Đạt kiểm tra build, logic và các luồng giao diện đã kiểm tra để push bản triển khai. Không coi đây là chứng nhận hoàn tất toàn bộ T12: cảm biến và hiệu năng trên thiết bị thật chưa được xác minh.

Không gian sao và trang Projects giữ được phong cách thị giác tốt; tủ sách và Zney OS rõ ràng, dễ đọc hơn. Workspace dọc vẫn có góc máy khá sát màn hình máy tính: có thể tinh chỉnh framing sau khi thử máy thật. Không thay intro hoặc đường bay gốc trong đợt review.

## Sửa trong review
- Nút Begin the journey trước đây không chuyển hash khỏi cosmos: gọi điều hướng đúng; đã click trong browser và xác nhận #/home.
- Project mở từ danh sách công khai trước đây dùng reader cũ, trong workspace dùng reader có mục lục. Nay dùng chung ProjectDocument cho cả route mặc định và route chương.
- Chuẩn hóa chữ reader công khai 16px, heading 28/24px, heading nội dung 22px; bỏ giới hạn max-width mặc định của native dialog trên điện thoại; nút đóng 44px.
- Chọn chương trong mục lục trả focus về nút Contents, tránh focus rơi vào phần vừa ẩn.
- Kiểm tra heading chỉ đếm trong main; document modal có heading riêng hợp lệ.

## Bằng chứng
- pnpm run check:portfolio: PASS (20 Virgo, 26 scroll, 42 legacy bilingual renders, 10 projects, hai CV, GLB gốc và Markdown).
- pnpm run check:experience: PASS (routes, transitions, timeline, 1000 orbit phases, collision envelopes, hit proxies, tap/drag, assets/hash/budgets, 40 chương tài liệu, sensor math và audio lifecycle).
- pnpm run build: PASS. Còn cảnh báo chunk dùng chung khoảng 875KB raw / 236KB gzip.
- git diff --check: PASS; chỉ thông báo chuyển LF/CRLF.
- Browser trực tiếp: Projects desktop 1440x900 và portrait 390x844; workspace portrait; mở Contents → library → dự án; reader công khai → Contents → Architecture; Begin → home; OS desktop, ngang 844x390, CV từ OS.
- Ảnh tại docs/qa/review-2026-10-05. Ảnh before giữ để đối chiếu; ảnh after và os-landscape là bản sau sửa.

## Chưa xác minh / khác biệt cần biết
- Chưa thử iOS/Android thật, quyền sensor thực, pointer lock thành công trên browser hệ điều hành, screen reader, zoom 200%, PDF xuất thực, FPS/p95/nhiệt máy. Viewport mô phỏng không đại diện các kiểm tra này.
- Timeline trang 2 → 3 đã qua kiểm tra logic; chưa có video đo nhịp chuyển động trên thiết bị thật. Không kết luận độ mượt từ tần suất chụp của browser tự động.
- 40 chương hiện là nội dung biên tập từ portfolio, không phải bản sao đầy đủ README upstream.
- Travel/arrival/room tone đang để im lặng theo báo cáo triển khai; cần chọn asset nếu muốn soundscape hoàn chỉnh.
- Source GLB gốc được giữ; tiers dùng asset nhẹ hơn. Xem experience-implementation.vi.md cho thông số và các ngoại lệ so với plan.
