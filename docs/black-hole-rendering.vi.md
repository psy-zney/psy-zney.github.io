# Dựng Gargantua trong trình duyệt

Mốc hình ảnh: ảnh Gargantua do chủ repo gửi ngày 14/10/2026. Giữ kéo chuột
xoay quanh hố đen, reset, phím, entry workspace và các phần khác của portfolio.

## Đường dựng

- Tích phân tia sáng null trong tọa độ Kerr–Schild với gradient metric giải tích,
  midpoint bậc hai, tối đa 480 bước và bước nhỏ hơn gần photon ring để giảm mép
  rung/răng cưa do sai số tích phân. Chọn a/M = 0,6 theo lựa chọn hình ảnh
  của nhóm làm Interstellar. Capture do đường tia chạm chân trời, không do một
  mặt nạ hình tròn. Đĩa tiền cảnh được phép che ngang bóng theo yêu cầu mới.
- Đĩa mỏng có vật liệu khí procedural nhiều tầng noise, filaments và vùng hấp
  thụ; advect theo vận tốc góc Kerr, vòng trong nhanh hơn vòng ngoài. Clock được
  tăng tốc để thấy chuyển động trên website. Có chênh thời điểm lấy mẫu theo
  độ dài đường tia; đây không phải tích phân thời gian trễ đầy đủ của DNGR.
- Render riêng vào texture HDR half-float, ba lớp blur/bloom, filmic tone mapping.
  Ánh sáng trắng nóng ở vùng trong, vàng đồng ở ngoài; giảm Doppler như phong
  cách phim để cả hai phía của đĩa đọc được. Lọc octave noise theo footprint
  để giảm rung chi tiết; renderer không dùng ray bundles đầy đủ của DNGR.
- Texture ray và shade được đồng bộ tuyệt đối `rayResolution = resolution`
  (1280² cho high desktop tĩnh, 896² khi xoay góc nhìn / mobile / medium, và 640²
  cho low tier) để triệt tiêu lỗi răng cưa đạo hàm block 2×2 do nội suy NearestFilter.
  Khi góc nhìn đứng yên, cập nhật khí giới hạn ở 45/30 lần mỗi giây; đổi góc được
  ưu tiên render thêm, reduced motion chỉ render khi đổi góc. Tài nguyên GPU được dispose,
  viewport/clear/scissor của scene được khôi phục và texture dựng lại sau khi WebGL phục hồi.
- Đường tia hiện được dựng riêng vào bốn attachment half-float: ba giao điểm
  đầu với mặt phẳng xích đạo ngoài chân trời (`diskRadius > HORIZON = .9`) theo thứ tự
  chặt chẽ (tọa độ, Doppler/góc lướt) và capture/độ trễ. Tránh điều kiện lọc đĩa cứng ở tầng ray
  để không gây tráo đổi slot encounter hay vọt đạo hàm fwidth() tại ranh giới đĩa.
  Bóng đen hố đen dùng 5-tap kernel làm mượt biên shadowMask; độ đục quang học
  slant optical depth ngăn các vòng photon bậc 2/3 phía sau xuyên thấu qua đĩa tiền cảnh.
- Tháp Bloom cố định kích thước 3 tầng [192, 96, 48] độc lập với độ phân giải màn hình,
  giữ nguyên vẹn bán kính hào quang ấm áp cả khi đứng yên lẫn lúc xoay chuyển.
- Chuẩn hóa bộ lọc footprint cone theo mốc tham chiếu 640p kết hợp độ xoắn ốc Kepler
  (`woundAge + logR * 2.4` và `radialScale = pow(r, .45)`) giúp chất khí giữ độ mịn màng,
  kéo thành dòng plasma hữu cơ thay vì đốm rỗ tĩnh khi đứng yên ở độ phân giải cao.
- Cadence được đo trên frame thực. Ngưỡng scale giữ tối thiểu >= 0.75 để không bị tụt
  đột ngột xuống 640p; chỉ điều chỉnh sau quãng ổn định để tránh nhảy giật chất lượng.
- Prewarm shader ở target nhỏ trước đoạn Contact. LOD đường tia tăng theo
  kích thước chiếu của hố đen, thay vì dựng 2K ngay lúc nó vừa xuất hiện.
  Trong chuyến bay vào workspace giữ cache/LOD và góc mà người xem đã chọn;
  không reset góc hay dựng lại texture lớn giữa chuyển cảnh. Cadence shade
  dùng thời gian thực, không ép shade mỗi frame chỉ vì progress entry đổi.
- Ba chương trình ray/material/bloom biên dịch qua compileAsync từ lúc mở
  scene. Noise dùng atlas RG 256² sinh bằng seed cố định, nội suy ba chiều;
  octave vẫn được lọc theo footprint. Cách này giảm lượng phép hash mà driver
  phải mở rộng khi compile, giữ chuyển động camera trong lúc shader chuẩn bị.
- Vật liệu có nhiều cell nhỏ hơn, eddy rộng tạo tương phản ở góc lướt để vùng
  tiền cảnh không thành một dải nhẵn. Vòng trong trắng nóng, vòng ngoài cam
  đồng; field được đổi mượt mỗi 2,5 giây, tuổi tối đa 5 giây để hạn chế shear.
- Phóng hố đen desktop thêm khoảng 26%; điện thoại giữ kích thước vừa chiều
  rộng. Nút và vùng kéo được căn theo mức zoom. Hố đen hiện từ vị trí 5.30–5.40,
  giữ kích thước trong world; camera tiến thẳng nên phối cảnh lớn dần.
- Vignette phục vụ đọc chữ mờ đi trong đoạn tiếp cận để không làm mất vùng
  trắng nóng, đặc biệt ở bố cục hố đen căn giữa điện thoại. Góc nhìn dưới đĩa
  tự thu nhỏ vừa đủ nếu đĩa mở rộng theo chiều dọc, giữ nút workspace bên dưới.
- Lọc noise theo số pixel thực mà mặt phẳng chiếm trên màn hình, kể cả DPR,
  khoảng cách và góc giao tia với mặt đĩa. Lọc cả tầng fine noise trước đây chưa
  được lọc; giảm tần số vân xuyên tâm và tăng cấu trúc theo góc để tránh vòng
  lặp dày đặc. HDR radiance có mipmap trilinear và anisotropy tối đa 8 để thu
  nhỏ từ texture ray về màn hình. Đây là lọc không gian, không phải TAA.
- Footprint lấy derivative của tọa độ giao điểm cache, tính cả lens magnification
  và góc lướt; nhân với tỷ lệ minification thực. Vật liệu nền lấy noise trong
  tọa độ Cartesian của đĩa, giảm các dải đồng tâm. Các luồng mỏng và fine noise
  vẫn cùng advect trên đĩa, không phát sinh hạt bay ngoài màn hình.
- Footprint tính thêm đạo hàm vận tốc góc theo bán kính để lọc cả vân bị shear
  khi khí quay. Hai lớp cell nhiễu động được advect theo Kerr rồi chuyển tiếp
  bằng smoothstep mỗi 2,5 giây, tuổi tối đa 5 giây. Giá trị và vận tốc liên tục
  tại ranh giới; tránh một texture bị cuốn thành vô số vòng nhỏ khi chạy lâu.

Đây là mô phỏng WebGL tương tác với vật liệu khí nghệ thuật, không phải mô
phỏng GRMHD hoặc chất lượng ray-bundle IMAX của DNGR. Không dùng ảnh/video
Gargantua thay cho hình tương tác, không tải asset phim hoặc đổi GLB/preview gốc.

## Nguồn và kiểm tra

[James, von Tunzelmann, Franklin & Thorne — DNGR, 2015](https://arxiv.org/html/1502.03808v2)
giải thích lựa chọn spin 0,6, giảm Doppler, lens flare và đĩa phía trước/trên/dưới.
Metric trong shader dùng dạng Kerr–Schild thay cho Boyer–Lindquist của DNGR.

`pnpm run check` kiểm tra dữ liệu, luồng và build. `pnpm run check:ui` kiểm tra
ảnh thật và hai thời điểm, bóng ở hai phần không bị đĩa che, dải sáng tiền cảnh,
phạm vi khí, đổi phối cảnh khi kéo, reduced motion, touch scroll và workspace.
Ảnh và JSON nằm trong `artifacts/feature-preservation/`. Các giới hạn cảm giác
audio/touch trên thiết bị thật vẫn áp dụng như tài liệu preservation.

Báo cáo kiểm tra hiện hành và giới hạn nằm trong `docs/final-audit.vi.md`.
