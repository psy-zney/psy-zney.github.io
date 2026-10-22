# Hoàn thiện và rà soát portfolio — 22/10/2026

## Kết quả

- Mobile có bố cục đọc riêng dưới 1000px, chiều cao theo dự án hiện tại.
  Thanh chuyển dự án nằm sau toàn bộ nội dung/hành động; wheel dọc đọc
  nội dung, swipe ngang và nút đổi dự án. Desktop giữ bố cục hai vùng.
- Contact dùng nền kính tối trung tính, phân biệt lời mời, email/copy và
  từng kênh kết nối. Hoạt ảnh chỉ chạy khi phần đó đang hiển thị.
- Giữa hố đen và showcase, ba preview gốc mở thành cửa sổ trong 1.65s.
  Trạng thái ảnh tải/lỗi là thật; Escape/đảo cuộn phục hồi, reduced motion
  đi trực tiếp. Không đổi đường camera XYZ.
- Giới thiệu nêu rõ học vấn, hướng chuyên môn và kinh nghiệm cá nhân,
  freelance, nhóm. Skills và Delivery có vai trò khác nhau. Continue đi
  qua đầy đủ nội dung thay vì bỏ thẳng sang showcase.
- Ba CV mới là HTML/CSS độc lập trên giấy trắng, nguồn DOCX/PDF được giữ.
  Tải phụ nằm trong More; URL cũ vẫn mở được CV hiện tại. Nhãn CV trong
  Recently read của Zney OS dùng đúng tên, cả với URL cũ.
- Galaxy JS-CSS, hiệu ứng kính và chuyển động đang có được giữ cùng các
  assets thật, sản phẩm, case study, workspace, âm thanh và recovery.

## Kiểm chứng

| Kiểm tra | Kết quả và phạm vi |
| --- | --- |
| pnpm run check | PASS: source, SSR song ngữ, route, asset hash, lifecycle, toán học, TypeScript và production build. |
| pnpm run check:ui | PASS đầy đủ desktop, tablet, phone, landscape, reduced motion. Sau thay đổi duy nhất về nhãn Recently read, kiểm tra đầy đủ phone/reduced đạt lại trên source cuối. |
| pnpm run check:audit | PASS 23 nhóm trên desktop, phone và desktop hẹp: mở/đóng 10 card, 40 mục case study, Next section/Contents/copy, 3 CV, 9 world, Contact, library, room settings, 6 ứng dụng OS và More mobile; admin dùng fixture. |
| check-journey-reading-ui | PASS 6 viewport: Home/About tách biệt, đầy đủ Continue, bấm đủ 5 kỹ năng, Skills/Delivery riêng, hover/tap, archive và CV. |
| check-mobile-showcase-ui | PASS 8 viewport/chế độ chữ: 9 dự án, 44px targets, nội dung và nav không đè, swipe native và quay lại đúng lựa chọn. |
| check-intro-ui | PASS 5 cấu hình: Start, đi/ngược/huỷ, About chi tiết sau reload. |
| check-info-panels-ui | PASS 5 cấu hình: kính trong, cuộn, Close cố định và phục hồi. |
| check-resume-ui | PASS 5 cấu hình cho 3 CV, nguồn tải, mục lục/Escape, in riêng/A4, lỗi/retry. Kiểm tra workspace trên source cuối đạt cả 3 CV mới và 3 alias, mở lại đúng tài liệu. |
| check-pointer-motion-ui | PASS 5 cấu hình: kéo, hai biên, hủy/blur, flick một dự án, chặn click xuyên. |
| check-showcase-arrival-ui | PASS desktop/phone/small/landscape, ảnh lỗi, reduced motion; có ảnh mở và vào lại. |
| check-audio | PASS Worker, tín hiệu hai stem, unlock/retry, mute/hidden/dispose, cô lập workspace và cue menu trên desktop/phone. |
| git diff --check | PASS. |

Bằng chứng chính: artifacts/final-audit/. Các bộ chuyên biệt giữ kết quả
mới tại artifacts/cv-update/, info-panels/, universe-intro/, pointer-motion/,
audio/ và showcase-arrival/. Đã xem ảnh Contact desktop/mobile, showcase
mobile/desktop, About/Delivery và đoạn dẫn mở preview.

Bản kiểm tra UI đủ 5 cấu hình: source 7a41b85410a7. Source cuối sau sửa
nhãn CV: 5050c599f811; UI phone/reduced, source/build, audit chức năng và
kiểm tra CV workspace đều đạt. Các file test khác và tài liệu sau đó không
thay đổi runtime. Kiểm tra intro cũ còn chờ câu teaser đã được thay bằng
hồ sơ chi tiết; đã đổi sang xác minh tiểu sử/kinh nghiệm/fit và chạy đạt.
Clipboard được chờ phản hồi bất đồng bộ trước khi xác nhận trạng thái.

## Dọn dẹp

Xóa ghi chú thiết kế, ảnh/report QA lịch sử và script chỉ kiểm tra các cảnh
đã thay. Rút baseline thành bản đồ chức năng, bỏ giới hạn một câu/hai dòng
và các bản ghi ép giữ thiết kế bị chê. Giữ nguồn/attribution và LICENSE
của React Bits; đây là giấy phép mã nguồn, không phải tài liệu thiết kế.

Dọn 3.263 file trong các artifact/cache repo cũ, khoảng 1.707 MiB. Dọn 61
thư mục metadata/cache Codex và git tạm hơn một ngày, khoảng 158 MiB.
Default/Cache của ứng dụng đang chạy chỉ dọn được một phần do khóa file;
không đóng ứng dụng để ép xóa. Cấu hình, lịch sử chat, đăng nhập, plugin,
profile trình duyệt, GLB và preview gốc được giữ. Cache Vite đang phục vụ
preview hiện hành và production build cuối được giữ để tiếp tục xem.

## Giới hạn

- Chromium giả lập không xác nhận hiệu năng/cảm giác chạm, sensor/pointer
  lock vật lý hoặc chất lượng nghe trên điện thoại và loa/tai nghe thật.
- Live iframe trong kiểm tra hành trình dùng fixture cục bộ; khả năng nhúng
  và tình trạng website bên ngoài phụ thuộc máy chủ của sản phẩm.
- Admin dùng dữ liệu giả cục bộ, không truy vấn thông tin tài khoản riêng.
- Build đạt nhưng vẫn cảnh báo bundle chính khoảng 1.55 MB, gzip 465 kB.

## Cập nhật cache theo deployment — 22/10/2026

- GitHub Actions truyền github.sha vào VITE_DEPLOY_VERSION. Mỗi build xuất
  deployment.json và deployment-worker.js; CI xác minh chúng cùng phiên bản
  với bootstrap trước khi upload Pages artifact.
- Khi vào bản mới, clearWebsiteCache dọn Cache Storage cùng origin và
  registration ở scope của website. Worker mới nhận quyền trước khi mount
  ứng dụng; tài nguyên public dùng URL có phiên bản, HTML/metadata không
  dùng HTTP cache. Bản không đổi dùng lại cache để tránh tải lại GLB lớn.
- Gate inline độc lập phục hồi HTML cũ ngay cả khi bundle JS cũ đã bị xóa.
  Tự tải lại tối đa một lần cho bản mới, giữ query/hash, tránh vòng lặp CDN.
  Cookie, preferences và lịch sử vẫn giữ; không xóa cache toàn trình duyệt.
- Lỗi metadata, storage bị chặn hoặc worker không được phép không khóa
  entry. Dev không đăng ký worker. Cơ chế áp dụng sau khi deploy hoàn tất.
- PASS: pnpm run check, check:cache (hai bản A/B, HTTP cache, ảnh, HTML CV,
  Range media, route, storage lỗi, metadata lỗi/sai định dạng, mất bundle
  cũ, chống lặp và mở CV từ production build thật).
- PASS: check:ui đầy đủ phone/reduced sau bootstrap mới. Kiểm tra chờ DOM
  ứng dụng thực thay vì suy ra app đã sẵn sàng vì chưa có loader trong DOM.
  Đã xem ảnh CV production và gallery điện thoại. Log, JSON và ảnh ở
  artifacts/deployment-cache/. Cảnh báo bundle lớn và giới hạn thiết bị
  thật đã nêu ở trên vẫn áp dụng.
