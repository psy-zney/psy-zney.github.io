# Chỉnh GLB workspace bằng Blender — 6 October 2026

Blender 5.2.1 LTS được điều khiển trực tiếp bằng Python (`bpy`). Phiên này không có Blender MCP. File `.blend` đã được mở trong ứng dụng Blender; scene có camera và ba softbox để so sánh trước/sau cùng góc nhìn. Camera/đèn phục vụ review không được xuất vào GLB website.

## Thay đổi trong mô hình

- Bo cạnh ba đoạn cho khung màn hình, vỏ màn hình, trụ/đế/chân màn hình và vỏ dưới bàn phím; dùng weighted normals để mặt phẳng không bị lượn ánh sáng.
- Chân màn hình chuyển sang nhôm anodized màu charcoal, roughness 0.32 và metallic 0.72. Khung màn hình bớt bóng, tách được mép khi nhận reflection.
- Giảm metallic của vỏ dưới bàn phím từ khoảng 0.81 xuống 0.35, tăng roughness từ khoảng 0.22 lên 0.42. Vỏ bên dùng nhựa tối có roughness 0.48.
- Vật liệu đen dùng trên dây cáp và một số chi tiết chung tăng roughness lên 0.48. Texture RGB, vân gỗ, sách và mặt màn hình được giữ.
- Giữ toàn bộ bố trí và các root tương tác. Không dựng lại phòng hoặc đổi thiết kế thùng PC trong đợt chỉnh này.

## File và tái tạo

`public/model/main.glb` là bản gốc, giữ nguyên SHA256 `e7477587b9d43c1852522c74c93a9d35325c318e459248a27193b09ff7382732`.

File làm việc cục bộ nằm trong `artifacts/blender/` (không đưa file Blender lớn lên Git):

- `workspace-baseline.blend`: nhập từ nguồn gốc.
- `workspace-refined.blend`: scene đã chỉnh, có camera/đèn review.
- `workspace-refined-source.glb`: nguồn xuất đầy đủ trước nén.
- `before.png`, `after.png`, `refinement.json`: ảnh cùng camera và danh sách thay đổi.

Tái tạo trong PowerShell từ thư mục repo:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/blender/inspect_workspace.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/blender/refine_workspace.py
node scripts/blender/check-refinement.mjs
node scripts/prepare-workspace.mjs artifacts/blender/workspace-refined-source.glb
pnpm run check:experience
pnpm run check:portfolio
pnpm run build
```

Ba file `public/model/workspace-{low,medium,high}.glb` là bản dùng trên website. Manifest ghi SHA256/bytes nguồn xuất từ Blender và từng tier. Pipeline chặn export làm dịch chuyển bốn anchor tương tác hơn 0.001 đơn vị; script riêng kiểm tra bounds của 12 root và dữ liệu POSITION/TEXCOORD của mặt màn hình.

## Phạm vi kiểm tra

| Tier | GLB bytes | Tam giác | Texture RGBA fallback ước tính |
|---|---:|---:|---:|
| Low | 3,506,012 | 80,273 | 41.8 MiB |
| Medium | 6,013,060 | 147,849 | 73.4 MiB |
| High | 9,249,092 | 168,377 | 149.8 MiB |

`check:experience`, `check:portfolio` và `check-refinement.mjs` PASS. Build PASS với cảnh báo chunk lớn đã tồn tại. Browser kiểm tra desktop 1440×900, điện thoại dọc 390×844 và ngang 844×390. Low/medium hiển thị GIF chuyển frame; chọn trực tiếp màn hình ở portrait low và desktop medium đều mở Zney OS. Không có console error trong lượt kiểm tra này. Ảnh bằng chứng nằm trong `docs/qa/blender-2026-10-06/`.

Kiểm tra trực quan trên trình duyệt là bằng chứng bố trí và hiển thị, không thay cho đo GPU/FPS hay cảm biến trên điện thoại thật. Đây là đợt chỉnh cạnh và vật liệu của mô hình hiện có, chưa phải một thiết kế workspace mới hoàn toàn.
