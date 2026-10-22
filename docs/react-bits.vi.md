# React Bits: tích hợp có chọn lọc

Đối chiếu nguồn chính thức ngày 22/10/2026. React Bits cài từng component
dưới dạng source. Repo chưa cài package `react-bits`; lần này bổ sung source
theo mô hình copy-paste, không đổi phiên bản React.
Website này dùng React 18 + Vite + TypeScript, chọn hướng TS + CSS thuần.

Nguồn: [React Bits](https://reactbits.dev/),
[README](https://github.com/DavidHDev/react-bits#readme),
[giấy phép](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md).
README hiện ghi 200+ component và bốn biến thể JS/TS + CSS/Tailwind;
không dùng con số 210+ như một cam kết phiên bản cố định.

## Phần đã áp dụng

`src/components/reactbits/PointerEffects.tsx` rút gọn và điều chỉnh từ:

- [Magnet TS + CSS](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Animations/Magnet/Magnet.tsx),
  blob SHA `41fe23b277c17643cea7bafef8bcafee06390a5f`: độ lệch từ tâm chia
  cho strength và giới hạn vector. Nút email Contact kéo nội dung tối đa 6px;
  vùng click và bố cục link giữ nguyên.
  Lượt nâng cấp chuyển động dùng cùng hook cho `MagnetButton` ở Start;
  vẫn chỉ dịch nội dung tối đa 6px trong hitbox cố định, giữ focus/reset
  và tắt trên touch/reduced motion.
- [SpotlightCard TS + CSS](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Components/SpotlightCard/SpotlightCard.tsx),
  blob SHA `1a2b2fdb2a8627fa3551af987a6a9b4600ab27d1`: gradient theo tọa độ
  con trỏ trên bìa dự án. Màu lấy từ dự án; focus bàn phím dùng ánh sáng
  tĩnh ở tâm và giữ outline có sẵn.

Đây là các bản thích nghi nhỏ cho portfolio, không phải bản sao đầy đủ API
của upstream. Không thêm dependency, canvas, shader, clock hoặc RAF. Chỉ xử lý
pointer cục bộ; dọn listener khi unmount. Reset khi leave/cancel/focus/scroll,
ẩn tab, blur hoặc đổi media query. Touch không hút/rê sáng; reduced motion
tắt chuyển động ngay cả khi đổi tùy chọn lúc trang đang mở.

Giữ nền GLB, camera, đường bay, orbit, preview, bộ chọn chín sản phẩm,
case study/CV, SFX, nội dung và đích liên kết. Galaxy được bổ sung riêng ở
intro theo yêu cầu mới bên dưới; không đổi Next.js/SSR vì dự án dùng Vite.

## Galaxy tại intro

Source JS + CSS từ [registry Galaxy](https://reactbits.dev/r/Galaxy-JS-CSS.json),
bản nhận ngày 22/10/2026 lưu tại `public/vendor/react-bits/Galaxy-JS-CSS.json`.
Registry không liệt kê dependency; phiên bản này dùng WebGL2 trực tiếp.
JSX chỉ bỏ `WEBGL_lose_context.loseContext()` trong cleanup: StrictMode chạy
lại effect trên cùng canvas nên lệnh đó làm nền mất context vĩnh viễn.
Vẫn xóa program, buffer, VAO và hủy RAF/listener/observer khi unmount.
`Galaxy.d.ts` khai báo các props được tích hợp để dùng JSX trong dự án TypeScript.
Thêm sao phía trên nền GLB gốc, đầy viewport thay vì khung demo cao 600px.
Giữ cấu hình người dùng yêu cầu, dừng chuyển động/tương tác khi reduced motion,
gỡ khi ẩn tab hoặc phát video. Có thêm một WebGL context tại intro;
không thể suy ra hiệu năng thiết bị thật từ kiểm thử trình duyệt.

## Bảo trì và giới hạn

Mã nguồn đã copy cần đồng bộ thủ công khi upstream có bản sửa. Các blob SHA
trên giúp nhận biết bản đã đối chiếu. Giấy phép MIT kèm Commons Clause được
giữ tại `public/vendor/react-bits/LICENSE.md` để đi cùng bản build website;
không mô tả là MIT thuần.

Kiểm tra: `pnpm run check`, `pnpm run check:ui` và
`node scripts/check-react-bits-ui.mjs`. Ảnh/report kiểm tra riêng nằm ở
`output/playwright/react-bits/`. Browser emulation không xác nhận touch,
âm thanh hoặc hiệu năng trên phần cứng thật.

Kiểm tra riêng React Bits đã PASS desktop 1440×900, tablet 762×715,
phone 390×844, landscape 844×390 và reduced motion. Bao gồm giới hạn lực hút,
hitbox đứng yên, đổi reduced motion lúc đang hover, reset sau cuộn, focus
bàn phím, mở case study bằng Enter, tìm kiếm/xóa lọc, grid/list và sắp xếp.
Đã xem ảnh Contact và thư viện ở desktop, phone, landscape và reduced.

`pnpm run check` đã PASS sau tích hợp. `pnpm run check:ui` chạy hết năm chế
độ và từng chế độ đều qua assertion hành vi, nhưng **lượt tổng FAIL** vì
nguồn thay đổi đồng thời trong khi chạy (`UniverseIntro.tsx`,
`UniverseTransition.css` và các file Galaxy mới). Không coi lượt đó là PASS
toàn bộ: hash đầu `7a7dc3b1cbeb963793959e3c82e67d4bbcc3e49cc72ab8f8e9ba99cb952f6b62`,
hash cuối `3faf3802a67e314b09a57b5b676ec1b681219b6f55ad6ff712af330749d1ccc9`.
Báo cáo gốc: `artifacts/react-bits-regression/report.json`. Các chỉnh sửa
đồng thời được giữ nguyên; cần chạy UI tổng trên nguồn ổn định để chốt lại.
