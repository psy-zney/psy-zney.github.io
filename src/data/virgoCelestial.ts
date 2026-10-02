import * as THREE from "three";
import { clamp, smooth } from "./virgoFlight";

export const PLANET_TYPES = ["ocean", "gas", "crater", "lava", "ice", "rock"] as const;
export type PlanetType = typeof PLANET_TYPES[number];
export const planetType = (index: number, skills = false): PlanetType => PLANET_TYPES[(index + (skills ? 4 : 0)) % PLANET_TYPES.length];
const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453; return n - Math.floor(n); };
const palettes: Record<PlanetType, string[]> = {
  ocean: ["#06192e", "#124566", "#4e7157", "#b1a582"],
  gas: ["#614634", "#b18561", "#dbc5a0", "#efdfbd"],
  crater: ["#393939", "#666560", "#aaa59b", "#ded6c3"],
  lava: ["#171b24", "#333640", "#6f3522", "#fa8b34"],
  ice: ["#284c67", "#50809b", "#95c3d8", "#dbebed"],
  rock: ["#4d2920", "#8c4831", "#b97a53", "#d2b291"],
};

/** Small, deterministic maps generated once; no model or remote texture downloads. */
export function createPlanetMaps(type: PlanetType, seed: number, mobile = false) {
  const width = mobile ? 256 : 512, height = width / 2;
  const makeCanvas = () => { const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; return canvas; };
  const surfaceCanvas = makeCanvas(), reliefCanvas = makeCanvas(), cloudCanvas = makeCanvas();
  const ctx = surfaceCanvas.getContext("2d")!, relief = reliefCanvas.getContext("2d")!, clouds = cloudCanvas.getContext("2d")!;
  const pixels = ctx.createImageData(width, height), heights = relief.createImageData(width, height), vapor = clouds.createImageData(width, height);
  const colors = palettes[type].map(hex => new THREE.Color(hex).convertLinearToSRGB());
  const grids = [8, 16, 32, 64].map((w, layer) => ({ w, h: w / 2, values: Float32Array.from({ length: w * w / 2 }, (_, i) => random(i + seed * 173 + layer * 937)) }));
  const noiseAt = (u: number, v: number) => {
    let result = 0;
    grids.forEach((grid, layer) => {
      const x = ((u % 1 + 1) % 1) * grid.w, y = clamp(v) * (grid.h - 1);
      const ix = Math.floor(x), iy = Math.floor(y), tx = smooth(0, 1, x - ix), ty = smooth(0, 1, y - iy);
      const sample = (dx: number, dy: number) => grid.values[Math.min(grid.h - 1, iy + dy) * grid.w + (ix + dx) % grid.w];
      const a = sample(0, 0) * (1 - tx) + sample(1, 0) * tx;
      const b = sample(0, 1) * (1 - tx) + sample(1, 1) * tx;
      result += (a * (1 - ty) + b * ty) * [.52, .27, .14, .07][layer];
    });
    return result;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / width, v = y / height, n = noiseAt(u, v), fine = random(x + y * width + seed * 31);
    const latitude = Math.abs(v - .5) * 2;
    let value = clamp(n * 1.3 - .13), bump = n, cloud = 0;
    if (type === "ocean") {
      value = n < .48 ? clamp(n * .8) : .55 + smooth(.48, .72, n) * .32;
      if (latitude > .81 + n * .15) value = .97;
      bump = n < .48 ? .15 : n;
      cloud = smooth(.54, .73, noiseAt(u + .14 + Math.sin(v * 12) * .045, v)) * .72;
    } else if (type === "gas") {
      const band = Math.sin(v * 76 + Math.sin(v * 21) * 1.4 + n * 4);
      value = clamp(.53 + band * .24 + n * .23);
      const dx = Math.min(Math.abs(u - .62), 1 - Math.abs(u - .62)) / .085, dy = (v - .62) / .035;
      const storm = Math.exp(-(dx * dx + dy * dy) * 1.8);
      value = value * (1 - storm * .7) + .18 * storm;
      bump = .5;
    } else if (type === "lava") {
      const cracks = 1 - smooth(.006, .032, Math.abs(n - .5));
      value = .10 + n * .24 + cracks * .64; bump = n * .75 + cracks * .1;
    } else if (type === "ice") {
      const cracks = 1 - smooth(.003, .025, Math.abs(n - .48));
      value = clamp(.42 + n * .65 - cracks * .32); bump = n - cracks * .12;
    }
    const p = value * 3, a = Math.min(2, Math.floor(p)), mix = p - a;
    const offset = (y * width + x) * 4;
    for (let c = 0; c < 3; c++) {
      const channel = (color: THREE.Color) => c === 0 ? color.r : c === 1 ? color.g : color.b;
      pixels.data[offset + c] = clamp(channel(colors[a]) * (1 - mix) + channel(colors[a + 1]) * mix + (fine - .5) * .025) * 255;
      heights.data[offset + c] = clamp(bump) * 255;
      vapor.data[offset + c] = 239;
    }
    pixels.data[offset + 3] = heights.data[offset + 3] = 255;
    vapor.data[offset + 3] = cloud * 255;
  }
  ctx.putImageData(pixels, 0, 0); relief.putImageData(heights, 0, 0); clouds.putImageData(vapor, 0, 0);
  if (type === "crater" || type === "rock") {
    for (let i = 0; i < 65; i++) {
      const x = random(i + seed * 13) * width, y = (.12 + random(i + seed * 61) * .76) * height;
      const radius = (2 + random(i + 99) ** 3 * 13) * width / 512;
      for (const shift of [-width, 0, width]) {
        const gradient = ctx.createRadialGradient(x + shift, y, 0, x + shift, y, radius);
        gradient.addColorStop(0, "#11130e70"); gradient.addColorStop(.7, "#17191558"); gradient.addColorStop(.84, "#ded7c670"); gradient.addColorStop(1, "#ded7c600");
        ctx.fillStyle = gradient; ctx.fillRect(x + shift - radius, y - radius, radius * 2, radius * 2);
        const pit = relief.createRadialGradient(x + shift, y, 0, x + shift, y, radius);
        pit.addColorStop(0, "#202020"); pit.addColorStop(.7, "#555555"); pit.addColorStop(.85, "#eeeeee"); pit.addColorStop(1, "#88888800");
        relief.fillStyle = pit; relief.fillRect(x + shift - radius, y - radius, radius * 2, radius * 2);
      }
    }
  }
  const texture = (canvas: HTMLCanvasElement, colored = false) => {
    const map = new THREE.CanvasTexture(canvas); map.wrapS = THREE.RepeatWrapping;
    if (colored) map.colorSpace = THREE.SRGBColorSpace;
    return map;
  };
  return { surface: texture(surfaceCanvas, true), relief: texture(reliefCanvas), clouds: texture(cloudCanvas, true) };
}

export function createRockGeometry(detail = 1) {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const relief = .84 + .12 * Math.sin(x * 13 + z * 8) + .10 * Math.sin(y * 17 - x * 6);
    positions.setXYZ(i, x * relief, y * relief * .8, z * relief * .68);
    const shade = .65 + relief * .26;
    colors.set([shade, shade * .96, shade * .89], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function createPlanetRing(radius: number) {
  const inner = radius * 1.55, outer = radius * 2.55;
  const geometry = new THREE.RingGeometry(inner, outer, 96, 1);
  const positions = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
  for (let i = 0; i < positions.count; i++) uv.setXY(i, (Math.hypot(positions.getX(i), positions.getY(i)) - inner) / (outer - inner), .5);
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 4;
  const ctx = canvas.getContext("2d")!;
  for (let x = 0; x < 256; x++) {
    const u = x / 256, gap = (u > .54 && u < .59) || (u > .83 && u < .845);
    ctx.fillStyle = `rgba(201,181,149,${gap ? .025 : (.28 + random(x + 219) * .5) * smooth(0, .06, u) * (1 - smooth(.92, 1, u))})`;
    ctx.fillRect(x, 0, 1, 4);
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return { geometry, map };
}
