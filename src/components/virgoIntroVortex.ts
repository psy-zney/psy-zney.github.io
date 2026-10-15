// A reusable gas texture: noise is rasterized once, never in the animation loop.
let texture: HTMLCanvasElement | undefined;
let cloud: HTMLCanvasElement | undefined;
const hash = (x: number, y: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
};
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const u = x - ix, v = y - iy, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return (hash(ix, iy) * (1 - a) + hash(ix + 1, iy) * a) * (1 - b)
    + (hash(ix, iy + 1) * (1 - a) + hash(ix + 1, iy + 1) * a) * b;
}
function vortexTexture() {
  if (texture) return texture;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 640;
  const ctx = canvas.getContext('2d')!, pixels = ctx.createImageData(640, 640);
  for (let y = 0; y < 640; y++) for (let x = 0; x < 640; x++) {
    const dx = (x - 320) / 320, dy = (y - 320) / 320;
    const radius = Math.hypot(dx, dy), theta = Math.atan2(dy, dx);
    if (radius < .34 || radius > 1) continue;
    const winding = theta + Math.log(radius) * 4.8;
    const nx = Math.cos(winding) * radius * 6, ny = Math.sin(winding) * radius * 6;
    const warp = noise(nx * 1.4, ny * 1.4) * 3;
    const grain = noise(nx * 22 + warp, ny * 22) * .16 + noise(nx * 8 + warp, ny * 8) * .29 + noise(nx * 3, ny * 3) * .55;
    const arms = Math.max(0, Math.sin(winding * 3 + grain * 5)) ** 3;
    const filaments = noise(nx * 44 + warp * 4, ny * 44) ** 4;
    const inner = Math.min(1, (radius - .34) / .10), outer = Math.min(1, (1 - radius) / .25);
    const light = Math.min(1, .02 + grain * .35 + arms * grain * 1.2 + filaments * .3);
    const white = Math.max(0, (light - .63) * 2.6);
    const i = (y * 640 + x) * 4;
    pixels.data[i] = 8 + 54 * light + 170 * white;
    pixels.data[i + 1] = 30 + 138 * light + 70 * white;
    pixels.data[i + 2] = 55 + 184 * light;
    pixels.data[i + 3] = Math.min(1, inner * outer) * (.3 + grain * .7) * 255;
  }
  ctx.putImageData(pixels, 0, 0); texture = canvas; return canvas;
}

export function drawIntroVortex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation: number) {
  if (radius < 1) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, .90); ctx.rotate(rotation);
  ctx.drawImage(vortexTexture(), -radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

/** Transparent filament stamp, projected in world space on the tube wall. */
export function introGasTexture() {
  if (cloud) return cloud;
  cloud = document.createElement('canvas'); cloud.width = cloud.height = 128;
  const ctx = cloud.getContext('2d')!, pixels = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const r = Math.hypot((x - 64) / 64, (y - 64) / 64);
    const n = noise(x / 13 + noise(x / 35, y / 35) * 3, y / 4) * .7 + noise(x / 4, y / 2) * .3;
    const i = (y * 128 + x) * 4, light = Math.max(0, n - .32) * 1.5;
    pixels.data[i] = 18 + light * 190; pixels.data[i + 1] = 105 + light * 140; pixels.data[i + 2] = 180 + light * 75;
    pixels.data[i + 3] = Math.max(0, 1 - r) ** 1.5 * light * 160;
  }
  ctx.putImageData(pixels, 0, 0); return cloud;
}
