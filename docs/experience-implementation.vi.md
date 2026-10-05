# Triển khai experience / motion / workspace

Ngày biên tập: 05/10/2026. Đặc tả: `experience-motion-workspace-plan.vi.md`.

## Phạm vi đã triển khai

- Giữ intro, 14 sao / 16 cạnh, timing 8,4 s, fracture/handoff và tuyến camera/FOV/travel. `VirgoOpening.tsx`, `virgoOpening.ts`, dữ liệu `virgoTransit.ts`, `virgoSpaceRift.ts` và `virgoSpaceRiftRenderer.ts` không có diff; kiểm tra baseline vẫn được giữ trong `check:portfolio`.
- Chữ tại trạm lấy cùng tiến độ với camera; mở/đọc/đóng, inert, giữ reading anchor khi keyboard focus. Ba câu Home giữ reveal cũ. Copy, typography, mobile portrait/landscape, compact layout và các bước Need → Build → Connect → Learn đã được nối với UI.
- Registry dùng ID thật cho 10 dự án / 5 nhóm năng lực. Orbit basis chuẩn hóa, slot/period/radius, ring/moon/belt envelopes và source/doc links dùng chung. Chọn dự án dừng orbit, connector tránh sao và chữ; Skills chỉ có tối đa ba tín hiệu đến evidence trong 600 ms.
- Workspace tách controller, loader, camera/input, picking, quality, audio và reader. Bốn anchor vẫn tồn tại ở mọi tier. Camera dùng qBase × qOffset; gyro damping 1−exp(−10×dt), drag blend 120 ms, không cộng góc tuyệt đối gây drift. Desktop có pointer lock, E/click, Escape/Tab/blur và drag fallback; mobile có drag/tap, tilt opt-in, recenter và bù orientation quaternion.
- Reader native dialog, focus trap, restore focus/scroll, TOC 208 px, Contents sheet trong cùng dialog, prose 68ch / 16 px. Library có category sidebar 184 px, search debounce, counts, sort, grid/list và đủ 10 sách / 40 chương biên tập từ dữ liệu có nguồn.
- Hai CV canonical có tabs Web/Mobile, AbortController/Retry, Print / Save PDF, Download source; bản Web giữ bốn dự án selected, bản Mobile ba bullet/dự án. Ngày Updated là ngày biên tập, không thêm thành tích mới.
- Contact card 440 px, avatar chữ cái, danh sách kênh thật và Copy feedback. Không có ảnh chân dung đã xác minh trong repo để thay avatar chữ cái.
- Zney OS có sáu app; mobile Home/Projects/Docs/More, Contact trong More; reader/data dùng chung, nhớ app/scroll/recent document. Playground giữ state phiên, game chỉ nhận phím khi focus, D-pad 48 px / Dash 64 px, keyboard deck chỉ trong Playground.
- Một context audio opt-in, voice pool tối đa sáu, keyboard tối đa bốn, fade mute ≤100 ms, lưu sound/volume/quality. Intro/fracture giữ bộ phát cũ và ranh giới lifecycle riêng.

## Task và bằng chứng

| Task | Trạng thái triển khai / nghiệm thu | Bằng chứng |
|---|---|---|
| T00 | Baseline đã ghi; chưa đủ video/timepoint trên thiết bị thật | `qa/baseline-*.png`, bundle baseline HEAD |
| T01 | Đã triển khai, check tự động đạt | Parser public/workspace, reducer, ID/invalid routes |
| T02 | Đã triển khai, viewport QA đạt | 12 viewport library; ảnh trạm desktop/dọc/ngang |
| T03 | Đã triển khai, pure timeline/check baseline đạt; video scrub còn chờ | `check:portfolio`, source opening/transit/rift không đổi |
| T04 | Đã triển khai, check geometry đạt | 1.000 phase, clearance/envelopes/ID integrity |
| T05 | Đã triển khai, browser QA đạt các luồng chính | Một dialog root, TOC Escape, restore sách/focus/scroll, lỗi asset vẫn đọc CV |
| T06 | Đã triển khai; chưa benchmark tải/FPS thiết bị thật | Ba GLB, KTX2/Meshopt/local decoder, baked AO, inventory/hash/budgets |
| T07 | Đã triển khai; denied fallback đã kiểm tra, lock success chưa nghiệm thu thật | IAB từ chối lock → drag/Contents vẫn dùng được; picking occlusion/tap tests |
| T08 | Đã triển khai; **chưa nghiệm thu iPhone Safari / Android Chrome thật** | 10 chu kỳ đổi viewport khi reader mở; API no-data fallback; quaternion/invalid samples checks |
| T09 | Đã triển khai, data/filter/CV QA đạt; in PDF còn chờ nghiệm thu | 10 books, 40 docs, filter/search preservation, canonical CV/print CSS |
| T10 | Đã triển khai, browser QA đạt luồng vào/ra và game session | OS/reader screenshots, D-pad, recent app, 20 chu kỳ KTX2 |
| T11 | Đã triển khai, audio lifecycle/bundle/asset checks đạt; nghe trên loa thật còn chờ | Một context/6 voices/mute/hidden tests, quality prefs/queue |
| T12 | QA tự động và browser chính đã đạt; **chưa gắn release-ready** | Các giới hạn cụ thể ở cuối báo cáo |

## Timeline workspace đã áp dụng

| Luồng | Desktop | Mobile/compact | Reduced motion |
|---|---|---|---|
| Chọn vật → reader | Camera 650 ms; reader bắt đầu 450 ms, vào 320 ms; xong 770 ms | Camera 350 ms; reader bắt đầu 260 ms, vào 240 ms; xong 500 ms | Giữ pose, fade 150 ms |
| Đóng reader → phòng | Reader ra 220 ms; camera bắt đầu ở 100 ms, về trong 450 ms | Cùng overlap 100/220/450 ms | Không xoay camera, fade 150 ms |
| Screen → OS | Camera từ 120 đến 600 ms; OS bắt đầu 500 ms; surface vào 280 ms rồi giữ đến 900 ms | Camera 200 ms + crossfade 300 ms = 500 ms | Không xoay camera, fade 150 ms |
| OS → phòng | Fade 180 ms + camera 420 ms = 600 ms | Cùng 600 ms tổng | Fade 150 ms, giữ pose |

Low hoặc quad không ổn định dùng crossfade 300 ms thay projected surface; desktop giữ cuối timeline đến 900 ms. Các mốc nằm trong `motionTokens.ts`, được kiểm tra overlap và tổng thời gian; số thực tế có thể trễ một frame hoặc tải module chưa sẵn sàng. Bộ kiểm tra browser sau lần đồng bộ này xác nhận reader desktop 0,32 s / mobile 0,24 s, OS mobile 0,3 s, một dialog và trở lại overview. High KTX2 đã mở thành công trong IAB, không có fallback lỗi.

## Asset và ngân sách

Model nguồn: 84.360.672 bytes. SHA-256: `e7477587b9d43c1852522c74c93a9d35325c318e459248a27193b09ff7382732`. File này không được ghi đè.

Inventory có 62 texture, 74.103.540 bytes nhúng, không có duplicate byte-identical; texture lớn nhất 8192×4096. Chi tiết dimension/format/material/slot/hash trong `qa/workspace-source-inventory.json`.

| Tier | GLB bytes | Triangles nguồn | Texture compressed ước tính | RGBA fallback + screen/shadow, ước tính |
|---|---:|---:|---:|---:|
| Low | 3.521.860 | 82.927 | 10,44 MiB | 43,46 MiB / limit 48 |
| Medium | 6.024.316 | 148.275 | 18,36 MiB | 75,13 MiB / limit 96 |
| High | 9.262.912 | 168.727 | 37,44 MiB | 155,46 MiB / limit 192 |

KTX2 color dùng ETC1S, normal/linear dùng UASTC, có mipmaps. GPU format được KTX2Loader detect; có RGBA fallback. Tính RGBA bảo thủ để không tuyên bố mọi GPU đều có compression. AO/contact shadow tĩnh được bake vào vertex colors bằng BVH, không tạo thêm texture atlas. High có shadow map 1024; Low/Medium không có shadow runtime. Poster phòng dưới 150 KB; screen preview SVG 768×432, không decode GIF.

`public/model/workspace-manifest.json` ghi source, optimizer, encoder version và hash từng tier. `public/vendor/basis` có decoder, nguồn và license Apache-2.0. Encoder offline được pin commit/checksum và cache ở `scripts/.cache`; không tải encoder khi chạy website.

So với build HEAD `1c04b49a9924f6b173985018eec86f46a432dc01`, entry + scene + shared 3D tăng **6.866 bytes gzip**, dưới 30.000. OS + Playground thêm **8.709 bytes gzip**, dưới 120.000. Chi tiết: `qa/bundle-budgets.json`. Build vẫn có cảnh báo chunk 3D lớn như baseline; đây không phải lỗi build.

## Browser QA đã thực hiện

- Browser nhúng Codex trên Windows, viewport CSS; **không phải máy điện thoại thật**.
- 320×568, 360×800, 390×844, 430×932, 844×390, 932×430, 768×1024, 1024×768, 1280×720, 1366×768, 1440×900, 1920×1080: library đủ 10 sách, body 16 px, không overflow ngang. `qa/reader-viewports-final.json`.
- Systems có 4 sách; query Beat còn 1; mở doc/quay lại giữ filters. Reader và OS trả focus về đúng book href và scroll cũ. TOC Escape đóng TOC trước, vẫn giữ root dialog.
- 10 lần chuyển viewport dọc↔ngang khi CV đã mở giữ route, một dialog và không overflow. `qa/reader-orientation-cycles.json`. Đây không kiểm chứng gyro axes.
- 40 chu kỳ ở bản asset trung gian và 20 chu kỳ ở KTX2 cuối: room → CV/library/contact/OS → room. Sau warm-up, repeat giữ 65 geometries / 63 textures. `qa/ktx-lifecycle.json`. Resource count tăng lần đầu khi góc nhìn làm mesh trước đó bị cull xuất hiện; không thấy tăng tuyến tính qua repeat. Đây là **số allocation, không phải đo GPU memory bytes**.
- Mô phỏng thiếu GLB: poster/Contents hiển thị, CV đọc được khi không có canvas; khôi phục asset và Retry mở phòng. `qa/asset-error-contents-mobile.png`.
- Playground D-pad/Dash nhận input; chuyển Home rồi quay lại giữ `003 STEPS`. Keyboard/cursor của game không chiếm Projects/Documents.
- Contrast màu đọc: chữ chính/surface 16,00:1; chữ phụ/surface 9,58:1; focus/surface 12,61:1; focus/border 7,23:1. `qa/contrast.json`.

`qa/renderer-measurements.json` là số đo quan sát của **bản WebP trung gian**: Low 61 calls / 79.888 triangles / p95 8,6 ms; Medium 61 calls / 143.628 triangles / p95 7,5–8,3 ms. Không dùng chúng để khẳng định KTX2 cuối đạt trên điện thoại. Ở các lần chạy IAB nền, cửa sổ ba giây chỉ có ba samples (~1 Hz); p95 đó không đủ làm benchmark. Cần cold/warm và 60 s capture trên thiết bị thật theo plan.

## Giá trị triển khai và giới hạn chủ động

- Medium texture max dùng **768 px** thay 1024 mặc định: RGBA fallback 1024 vượt ngân sách 96 MiB sau mipmaps; 768 vẫn đủ chi tiết phòng và còn khoảng cho screen. High/Low giữ 2048/512.
- Màn dọc thấp dùng view offset để fit vùng sao khoảng 120 px; không thay world path/FOV. Màn ngang dùng top chữ **72 px** thay 56 để tránh nút Chapters cao 44 px + vùng an toàn. Body vẫn 16 px và cuộn nội bộ.
- Reader trên phone dưới 360 px một cột; từ 360 hai cột. Desktop category/TOC giữ 184/208 px. Caption và controls dựa DOM/halo đo thực, không ellipsis mô tả chính.
- Surface OS dùng bốn góc screen đã project nếu nằm trong frustum và sai khác cạnh dưới 5%; nếu crop/skew, Low hoặc coarse pointer thì dùng crossfade cùng preview/palette. Không áp homography cho chữ.
- Architecture docs là projection có nguồn từ portfolio; không bổ sung README dài khi chưa có snapshot biên tập mới. Không bịa project status/source URL. Avatar là initials từ tên thật.
- Travel-air/station-arrive và room-tone đang **silence** vì chưa có asset đã chọn/kiểm chứng; plan cho phép silence. Các cue UI ngắn được synthesize, không thêm WAV untracked hoặc nhạc nền. Pack Cherry MX có sẵn khoảng 1,98 MB chỉ tải khi sound opt-in và bắt đầu dùng Playground; không tính như asset SFX mới, nhưng vẫn phải tính vào lần mở game có sound.

## Kiểm tra và phần chưa nghiệm thu

`pnpm check:portfolio`, `pnpm check:experience`, `pnpm build` đã đạt. Kiểm tra mới bao gồm routes/reducer, 40 docs/10 books, 1.000 orbit phase, collision envelopes, proxy occlusion, tap 8 px / 250 ms và cancel/multi-pointer, sensor null/NaN, quaternion 0/90/180/270, asset hashes/budgets và audio opt-in/mute/hidden/voice pool. `git diff --check` sạch.

Chưa nghiệm thu: iPhone/iPad Safari + Android Chrome thật; chiều gyro/permission granted/denied thật; pointer-lock success/Tab/E trên browser cho phép lock; cold/warm network/FPS capture theo thiết bị; slow/offline/context-loss injection; OS-module timeout thực; browser zoom 200%/large text/screen reader; export PDF và xác nhận ≤2 trang; video handoff/scrub và nghe âm trên loa/tai nghe thật. Không đánh dấu các mục này pass bằng viewport emulator hoặc build.

Các file untracked sẵn có của chủ sở hữu (`public/sound/{crack,debris,rumble}.wav`, script fix/generate scene, `tmp_original.tsx`) không bị sửa/xóa. Không push/deploy trong đợt triển khai này.
