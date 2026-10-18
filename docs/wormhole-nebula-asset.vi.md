# Texture tinh vân cho hành trình xuyên hố đen

- Asset dùng trong project: `public/img/fx/wormhole-nebula-v1.webp`.
- Kích thước 1774×887, WebP quality 90, 611094 byte. Chuyển định dạng từ
  ảnh tạo gốc, không thay bố cục hoặc vẽ lại nội dung bằng xử lý ảnh.
- Tạo bằng **built-in image_gen**, không dùng CLI/API fallback hoặc tải
  ảnh trên mạng. Ảnh người dùng chỉ làm tham chiếu màu và mật độ chi tiết;
  atlas là texture mới, không phải ảnh mẫu cắt ra rồi đặt vào hầm.
- Đầu ra gốc được giữ tại
  `C:/Users/admin/.codex/generated_images/01a14b06-c9d0-72f2-ab2c-4386433aaf39/exec-f6f0e776-32df-47a9-a282-a3d8c1784cba.png`.
- Mã tiêu thụ: `SingularityLens.ts`, `singularityNebula.ts`. Không thay
  preview dự án, nội dung CV hoặc GLB của chủ repo.

Prompt đã dùng nguyên văn:

```text
Create ONE original production texture asset for the interior walls of a WebGL cosmic wormhole. Reference image 1 is ONLY a guide to the deep navy, electric blue, cyan, lavender and violet palette, extremely fine nebular filaments, star dust, and luminous gaseous detail. The output is NOT a tunnel illustration: it must be an unwrapped, flat 2:1 panoramic texture map that we will project into a spiral tunnel in code. Fill the entire image edge to edge with richly detailed, wispy interstellar emission nebulae and dark dust lanes, alternating flowing threadlike blue/cyan/violet ribbons along gently slanted horizontal paths. Photographic astronomical texture, wispy turbulent plasma, many scales of detail, tiny crisp star clusters and a few subtle warm pearl glints. Emissive narrow filaments, dark blue depths between the ribbons. High local detail but keep most of the image dark navy so it is usable as a luminous wall material. Consistent density over the frame, no focal center, no black hole, no vortex, no circular rings, no perspective, no frame, no text, no watermark, no logo. Seamless tiling in both axes: left/right edges and top/bottom edges should match naturally. This is a new original texture asset, not a crop or reproduction of the reference.
```
