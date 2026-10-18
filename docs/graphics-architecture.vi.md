# Kiến trúc đồ họa cosmic, portal optics và time rewind

Nguồn triển khai trực tiếp trong portfolio, 18/10/2026. Không thay ảnh sản
phẩm, GLB, case study hoặc URL. Nền là vũ trụ sâu, không dùng nguyên cảnh
nền phong cảnh của ảnh tham khảo.

## 1. Các lớp render

```text
VirgoPortfolio — route, reduced motion, hướng passage
 ├─ VirgoScene / CameraFlight — camera hành trình + camera xoắn cục bộ
 │   └─ BlackHoleVortex — ray Kerr, khí bồi tụ, clock có thể tua ngược
 ├─ SingularityPassage — một tọa độ thời gian cho toàn chuyến đi
 │   ├─ SingularityLens — peripheral distortion, RGB dispersion, cone
 │   ├─ khí đường hầm — mode 1 của cùng ShaderMaterial
 │   │   └─ singularityNebula + atlas tinh vân + bụi sao xoắn theo thời gian
 │   └─ whiteHoleParticle — ba tầng vật chất, vị trí analytic
 ├─ WorldsShowcase
 │   ├─ CosmicPortalField — một WebGL renderer cho nền, rim và kết nối
 │   ├─ ảnh preview DOM — lớp phẳng, không đi qua distortion pass
 │   └─ caption, nút, route — DOM giữ focus và hit testing
 └─ IntroLiquidSurface — dùng chung opticalCone cho hầm mở đầu
```

Mã nguồn:

- `src/data/singularityMotion.ts`: clock, quỹ đạo, góc camera, sợi bồi tụ.
- `src/data/worldsConstellation.ts`: chín địa chỉ trên vòm, độ sâu và pose lấy nét.
- `src/data/portalOptics.ts`: mask, góc Cherenkov, bụi và GLSL dùng chung.
- `src/components/SingularityLens.ts`: Three.js fullscreen material.
- `src/components/CosmicPortalField.tsx`: nền cosmic, plasma rim, energy links.
- `src/components/WormholeSurface.tsx`: phối hợp các pha passage.
- `src/components/singularityNebula.ts`: chiếu atlas thành các lớp tinh vân xoắn.
- `src/data/nebulaDust.ts`: quỹ đạo tuyệt đối của bụi gần/xa và đuôi cong.
- `src/components/WorldsShowcase.tsx` và `.css`: preview phẳng và tương tác.

Theo phác thảo cụm cổng mới, `worldsConstellation.ts` bố trí đủ chín địa
chỉ trên vòm lõm nông, có độ sâu và pháp tuyến khác nhau. Cổng đang chọn
tiến ra tọa độ (0,0,0), hết yaw/pitch/roll và lớn hơn; cổng trước thu nhỏ
về địa chỉ cố định phía sau. Chuyển tiếp CSS 0,95s có thể đổi hướng ngay
khi người xem cuộn ngược; không thêm quay camera Virgo hoặc autoplay.

Rim lấy nghịch đảo homography từ DOMMatrix hiện tại, thay cho ellipse
theo bounding box: tia qua pixel được đổi lại tọa độ mặt cổng, nên plasma
bám chính xác khi cổng nghiêng hoặc đang chạy theo chiều sâu. Các đường
năng lượng nối đủ chín cổng theo cung cong, không sắp theo một hàng ngang.

Nền/rim được render trước. Ảnh DOM đục nằm phía trên. Không đặt bộ lọc
displacement, bloom hoặc chromatic aberration trên container ảnh hoặc chữ.
Chín cổng dùng chung renderer; không tạo một WebGL context cho từng cổng.

## 2. Timeline thuận/ngược

Gọi D = 7,8 giây và s là số giây đã chạy theo hướng hiện tại:

```text
thuận: t = clamp(s, 0, D)
ngược: t = D - clamp(s, 0, D)
```

Mọi thuộc tính phải là hàm của t: camera C(t), quaternion Q(t), vật chất
P_i(t), pha noise và cường độ hiệu ứng. Không dùng `velocity *= -1` cho
một simulation đã tích lũy sai số qua nhiều frame. Không dùng random mới
trong render loop. Cùng seed và cùng t phải cho cùng trạng thái.

Với chuyển động vật chất:

```text
P_rewind(s) = P(D - s)
dP_rewind/ds = -P'(D - s)
```

Đây là lý do white-hole ejection đổi vector đúng khi t giảm. Camera cũng
đọc lại cùng hàm quỹ đạo; góc nhìn quay ngược mà không phát một animation
quay phụ. Khi hủy giữa đường tại t0, chiều về bắt đầu từ t0, không từ D.

Ba pha: orbit 0–3,2; throat 3,2–5,6; white-hole exit 5,6–7,8. Handoff route
ở t=4,3. Tab ẩn dừng clock; reduced motion tới đích ngay.

## 3. Bảo vệ preview và mask ngoại vi

Đặt A = width/height; u,v thuộc [0,1]. Tọa độ aspect-correct:

```text
p = ((u - 0.5) A, v - 0.5)
rho = 2 ||p||
M = smoothstep(0.60, 1.12, rho)
```

Trong vùng rho ≤ 0,60, M bằng đúng 0. Mọi displacement và spectral offset
đều phải nhân M, không chỉ alpha cuối cùng. Mask này có cùng định nghĩa
trong JavaScript và GLSL để kiểm tra toán học cùng shader thật.

```glsl
float peripheralMask(vec2 uv, vec2 resolution) {
    vec2 p = (uv - .5) * vec2(resolution.x / resolution.y, 1.);
    return smoothstep(.60, 1.12, length(p) * 2.);
}

vec2 p = (uvPoint - .5) * aspect;
float r = length(p);
float mask = peripheralMask(uvPoint, resolution);
float field = strength * exp(-pow((r - .40) / .24, 2.)) * mask;

float a = field * .24;
vec2 bent = mat2(cos(a), -sin(a), sin(a), cos(a))
          * p * (1. - field * .18);
vec2 uv = clamp(.5 + bent / aspect, vec2(.002), vec2(.998));
vec2 spectral = normalize(p + vec2(.00001)) * field * .003 / aspect;

vec3 color = vec3(
    texture2D(sceneImage, clamp(uv + spectral, vec2(.002), vec2(.998))).r,
    texture2D(sceneImage, uv).g,
    texture2D(sceneImage, clamp(uv - spectral, vec2(.002), vec2(.998))).b
);
```

Trong showcase, ảnh sản phẩm không được đưa vào `sceneImage`; nó vẫn là
DOM `<img>` với `transform: none`. Vì vậy ngay cả khi cổng nằm lệch giữa
màn hình, preview không bị biến dạng. CSS clip hình tròn chỉ định khẩu độ;
không phải phép bẻ cong ảnh. Shader rim có mask cục bộ riêng quanh mép r≈0,82.

Rim của từng cổng dùng phép đổi tọa độ riêng:

```text
screen_h = H_css * (local_x, local_y, 1)
local_h = inverse(H_css) * (pixel_x, pixel_y, 1)
q = local_h.xy / local_h.z
```

H_css được dựng từ DOMMatrix đang được CSS nội suy, kích thước mặt phẳng
và perspective f=1100px dùng chung. Shader tính r=length(q) để đặt plasma
đúng trên mặt cổng nghiêng, thay vì vẽ ellipse theo bounding box. Phép đổi
này chỉ định vị ánh sáng rim; không lấy mẫu lại texture của preview DOM.

## 4. Nón quang học và phạm vi vật lý

Định nghĩa beta = v/c, với c là tốc độ ánh sáng trong chân không. Bức xạ
Cherenkov vật lý trong môi trường điện môi có điều kiện beta*n > 1:

```text
cos(theta_c(lambda)) = 1 / (beta n(lambda))
n(lambda) ≈ A + B / lambda^2
```

Góc trên là hướng photon so với vận tốc hạt. Nguồn:
[PDG, Passage of Particles Through Matter, mục 34.7.1](https://pdg.lbl.gov/2024/reviews/rpp2024-rev-passage-particles-matter.pdf).

Trong portfolio, beta=1,16 và ba chỉ số 1,315 / 1,335 / 1,36 là tham số
nghệ thuật cho giả định v>c, không phải mô phỏng chuyển động siêu quang
được vật lý xác nhận. Lỗ trắng cũng là cấu trúc giả định trong trải nghiệm.

Shader có góc khác nhau theo R/G/B, lấy mẫu dọc trục Z để chiếu thành các
lát nón. Với apex z0 và tiêu cự chuẩn hóa f:

```text
R_cone(z, lambda) = (z - z0) tan(theta_c(lambda))
r_screen(z, lambda) = f (1 - z0/z) tan(theta_c(lambda))
I_lambda = sum_z exp(-((r-r_screen)/sigma(z))^2) w(z)
I_final = I_lambda * M * A_phase
```

```glsl
vec3 index = vec3(1.315, 1.335, 1.36);
vec3 cosTheta = 1. / max(vec3(1.0001), beta * index);
vec3 tanTheta = sqrt(max(vec3(0.), 1. - cosTheta*cosTheta)) / cosTheta;
vec3 light = vec3(0.);

for (int i = 0; i < 7; i++) {
    float z = .8 + float(i) * .32;
    vec3 projected = .64 * tanTheta * (1. - .35 / z);
    vec3 shell = exp(-pow((vec3(r)-projected) / (.009+z*.003), vec3(2.)));
    light += shell * (.018 / (1.+z)) * (.7+.3*sin(phase*5.-z*4.));
}

light *= vec3(.10,.48,1.) * peripheralMask(uv, resolution)
       * smoothstep(vec3(1.), vec3(1.03), beta * index);
```

Biên độ nhỏ và envelope theo pha chuyển động tránh biến nón thành một
flash hoặc vòng tròn che preview. Đây là phép chiếu nón xấp xỉ, không giải
phương trình Maxwell, phân cực, tán xạ nhiều lần hoặc truyền sáng GR.

## 5. White-hole rewind và bụi đa tầng

`whiteHoleParticle(i,p,layer)` trả tọa độ tuyệt đối theo seed, tiến độ p
và tầng sâu. Có ba tầng depth = 1 + 1,7 layer, kích thước/cường độ giảm theo
độ sâu. Phương trình bán kính dùng trong code:

```text
r_i(p,l) = (0.018 + 0.22 seed_i + p^2(1.6 + 1.5 seed_i)) / sqrt(depth_l)
P_xy = r_i (cos(angle_i), sin(angle_i))
```

Đầu vệt lấy ở p, đuôi ở max(0,p-0,018). Khi p chạy ngược, cả đầu/đuôi
được lấy lại từ cùng hàm: vật chất tụ về lỗ trắng, các tầng bụi có vận tốc
chiếu khác nhau. Khí bồi tụ cũng lấy clock từ t thay vì tăng một clock riêng
trong lúc rollback. `flight.exit` được đồng bộ từ quỹ đạo, nên opacity,
góc camera và khí không chạy lệch nhau theo timer cũ.

## 6. Tích hợp Three.js trực tiếp

`SingularityLens` là lớp đang chạy trong repository, có ba chế độ:

```ts
const lens = new SingularityLens(sceneSnapshotCanvas);

// Tọa độ hiện tại có thể tăng hoặc giảm.
const sample = singularitySample(elapsed, direction);
const t = sample.t;

if (sample.phase === 'accretion') {
  lens.draw(compositeContext, width, height, sample.lens);
} else if (sample.phase === 'throat') {
  const progress = (t - SINGULARITY_ORBIT_END)
    / (SINGULARITY_THROAT_END - SINGULARITY_ORBIT_END);
  lens.drawTunnel(compositeContext, width, height, progress, t);
} else {
  // Vật chất dùng whiteHoleParticle(...); nón chỉ là lớp ngoại vi.
  lens.drawWake(compositeContext, width, height, t, amplitude);
}

// Khi unmount hoặc đổi chuyến bay:
lens.dispose();
```

Trong lớp Three.js:

```ts
const uniforms = {
  sceneImage: { value: new CanvasTexture(sceneSnapshotCanvas) },
  resolution: { value: new Vector2(width, height) },
  strength: { value: 0 },
  mode: { value: 0 },
  progress: { value: 0 },
  clock: { value: 0 },
};

const material = new ShaderMaterial({
  uniforms,
  vertexShader: `varying vec2 uvPoint;
    void main() { uvPoint=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader, // mã đầy đủ tại SingularityLens.ts
  transparent: true,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
});
scene.add(new Mesh(new PlaneGeometry(2, 2), material));
```

Hiện tại `addAfterEffect` lấy ảnh sau frame R3F rồi cập nhật CanvasTexture
cho lớp lens. Đây là cầu nối an toàn với các renderer hiện có, có chi phí
copy CPU/GPU. Không tự bật `preserveDrawingBuffer` trên cảnh chính. Với
pipeline thuần GPU trong cùng renderer, có thể chuyển scene đầu vào sang
`WebGLRenderTarget.texture` và dùng cùng fragment shader; không tạo
EffectComposer sau lớp DOM preview.

Đầu ra custom shader không chèn tone mapping lên ảnh DOM. Field cosmic
tự ánh xạ emission bằng `pow(1-exp(-radiance),1/2.2)` một lần; noise texture
giữ data linear. Scene preview gốc dùng cơ chế màu hiện có.

## 7. Hiệu năng, vòng đời và QA

Lòng hầm mới dùng texture WebP 1774×887 (611094 byte) được tạo riêng cho
hiệu ứng, không lấy ảnh sản phẩm làm vật liệu. Có mipmap/trilinear và
anisotropy tối đa 4. Noise chỉ điều biến các lớp khí; chi tiết tinh vân và
điểm sáng nằm trong atlas. Mỗi tile crossfade ở mép theo hai trục để
tránh seam, kể cả khi atan đổi nhánh. Pha khí và 420 hạt bụi đều chỉ lấy
thời gian passage; test render thật kiểm tra tua ngược khớp từng pixel.
Xem [nguồn asset và prompt](wormhole-nebula-asset.vi.md).

- Field cosmic: một renderer, tối đa DPR 1,5, 60Hz khi đổi cổng/đi vào,
  24Hz khi đứng; hidden không tăng time. Các cổng nền giữ ở mọi viewport.
- Mỗi effect tạo một canvas WebGL riêng rồi append vào host. Cleanup gỡ
  canvas, hủy RAF và dispose texture/material/geometry/renderer. Cách này
  chịu được StrictMode effect replay; canvas cũ đã forceContextLoss không
  được tái dùng cho renderer mới. Khi không tạo được WebGL, nền CSS và
  preview DOM vẫn còn để tiếp tục điều hướng.
- Lens: tối đa chiều rộng 1440, texture input lấy sau render, dispose khi xong.
- Hố đen giữ ray cache, chỉ observer cục bộ thay góc; ngân sách trong lúc orbit
  giữ theo hợp đồng hiện có. Chưa đo FPS/touch trên thiết bị thật.
- Reduced motion bỏ passage chờ và ambient; preview/URL/keyboard vẫn hoạt động.
- Không đưa đồng hồ DOM, Date.now hoặc random mới vào vị trí vật chất.

Kiểm tra logic, shader pixel, layout và đường về:

```sh
pnpm run check
pnpm run check:ui
node scripts/check-worlds-ui.mjs
node scripts/check-nebula-ui.mjs
node scripts/check-intro-ui.mjs http://127.0.0.1:5185/
```

Bộ worlds vẽ một checkerboard qua `SingularityLens` thật: số pixel thay
đổi trong vùng trung tâm phải bằng 0, ngoại vi phải đổi >100 pixel. Kiểm
tra thêm ảnh preview chiếm >70% đường kính cổng và `transform: none`;
các URL, phím, live preview, case-study return và rollback vẫn được giữ.

API tham khảo: [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html)
và [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).

Kết quả kiểm chứng trên source hiện tại:

- `pnpm run check`: PASS, gồm TypeScript và production build.
- Worlds: PASS desktop/tablet/phone/landscape/reduced, ảnh và report tại
  `artifacts/worlds-showcase/`. Test GLSL: centerChanged=0, edgeChanged=21056.
- Lòng hầm tinh vân: PASS desktop/phone/landscape, tua ngược shader khớp
  0 pixel sai; chặn asset vẫn có nền khí procedural. Report/ảnh tại
  `artifacts/nebula-passage/`. Bộ worlds xác nhận atlas được nạp trong
  pha xuyên hầm của hành trình thật và quay về đúng trên năm viewport.
- Intro: PASS desktop/tablet/phone trong
  `artifacts/portal-open-flow/intro/report.json`; landscape/reduced PASS trong
  `report-landscape-reduced.json` cùng thư mục. Phép đo thân tia lấy thành
  phần sáng liên thông, giữ nguyên ngưỡng sáng/aspect/độ dày để tránh sao
  nền rời rạc làm sai bounding box.
- `pnpm run check:ui`: FAIL ở assertion con trỏ baseline, dòng 99.
  Không coi đây là hồi quy tổng đã xanh. Ảnh showcase và passage đã được
  xem riêng; chưa benchmark FPS/touch trên thiết bị thật.
