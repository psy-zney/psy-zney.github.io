# Intro xé không gian — 14/10/2026

Intro chạy sau một thao tác, với camera phối cảnh z=1000 → 0 → -3000.
Hai tấm trời sao được cắt bằng Canvas path theo vết rách nghiêng 15°;
hạt đường hầm chiếu theo độ sâu, lời chào là DOM để giữ chữ sắc nét.
Đến giây 5, cảnh hành tinh hiện có được chuẩn bị ở vị trí 1,92; lớp intro
mờ hết lúc 5,5 giây. Nội dung câu có đủ bản Việt/Anh.

Kiểm tra riêng bằng Chrome đã cài:

```powershell
$env:UI_CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node scripts/check-intro-ui.mjs http://127.0.0.1:5183/
```

Đã PASS ở 1440×900, 762×715, 390×844, 844×390 và reduced motion.
Đã kiểm tra cảnh tĩnh, wheel, nút, phím khi vùng cuộn nhận focus, hai câu
không chồng nhau/cắt mép lúc đọc, điểm đến và hủy callback khi đổi route.
Đã xem ảnh tụ năng lượng, vết rách, lời chào và điểm đến trong
`artifacts/intro-flight/`. Script dùng clock ảo để chụp đúng mốc; không
chứng minh cadence, cảm giác audio hay thao tác trên thiết bị touch thật.

`pnpm run check:ui` tổng đã được chạy nhưng chưa PASS: có lần lỗi tương tác
iframe gallery và lần cuối timeout khi tải lại trang gốc (30 giây).
Không xóa hay nới assertion của những tính năng này.
