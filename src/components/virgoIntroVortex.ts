import { introPortalFormation, introVortexAngle } from '../data/virgoIntro';
import { liquidPigment } from './liquidSurface';
import { drawIntroLiquid } from './IntroLiquidSurface';

let layers: HTMLCanvasElement[] | undefined;
let cloud: HTMLCanvasElement | undefined;
const LAYERS = 12;
/** Feathered liquid sheets allow differential rotation without cut concentric edges. */
function vortexLayers() {
  if (layers) return layers;
  const size = 512, half = size / 2;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!, pixels = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x - half) / half, dy = (y - half) / half;
    const r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (r < .335 || r > 1) continue;
    const winding = a + Math.log(r) * 3.1;
    const pigment = liquidPigment(Math.cos(winding) * r * 5, Math.sin(winding) * r * 5);
    const edge = Math.min(1, (r - .335) / .015) * Math.min(1, (1 - r) / .16);
    const i = (y * size + x) * 4;
    pixels.data[i] = pigment.r * 1.65; pixels.data[i + 1] = pigment.g * 1.65; pixels.data[i + 2] = pigment.b * 1.65;
    pixels.data[i + 3] = edge * 255;
  }
  ctx.putImageData(pixels, 0, 0);
  layers = Array.from({ length: LAYERS }, (_, i) => {
    const sheet = document.createElement('canvas'); sheet.width = sheet.height = size;
    const c = sheet.getContext('2d')!, spacing = .665 / (LAYERS - 1), center = .335 + i * spacing;
    c.drawImage(canvas, 0, 0);
    const feather = c.createRadialGradient(half, half, 0, half, half, half);
    feather.addColorStop(0, 'transparent'); feather.addColorStop(Math.max(0, center - spacing), 'transparent');
    feather.addColorStop(center, '#fff'); feather.addColorStop(Math.min(1, center + spacing), 'transparent');
    if (center + spacing < 1) feather.addColorStop(1, 'transparent');
    c.globalCompositeOperation = 'destination-in'; c.fillStyle = feather; c.fillRect(0, 0, size, size);
    return sheet;
  });
  return layers;
}

export function drawIntroVortex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number, seconds = 0) {
  if (radius < 1 || radius * .33 > Math.hypot(ctx.canvas.width, ctx.canvas.height) * 1.2) return;
  const formation = introPortalFormation(seconds);
  if (formation.rim < .001) return;
  const dpr = ctx.getTransform().a;
  ctx.save(); ctx.globalAlpha *= formation.rim;
  if (drawIntroLiquid(ctx, ctx.canvas.width / dpr, ctx.canvas.height / dpr, seconds, time, { x, y, radius })) { ctx.restore(); return; }
  ctx.translate(x, y); ctx.scale(formation.aspect, .90); ctx.globalCompositeOperation = 'lighter';
  vortexLayers().forEach((sheet, i) => {
    ctx.save(); ctx.rotate(introVortexAngle(.335 + i / (LAYERS - 1) * .665, time));
    ctx.drawImage(sheet, -radius, -radius, radius * 2, radius * 2); ctx.restore();
  });
  ctx.restore();
}

/** Local energy gathers into a seam; it never flashes across the whole sky. */
export function drawIntroRiftBirth(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, seconds: number, time: number) {
  const formation = introPortalFormation(seconds), energy = Math.max(formation.charge, formation.seam);
  if (energy < .001) return;
  const dpr = ctx.getTransform().a, unit = Math.min(ctx.canvas.width, ctx.canvas.height) / dpr;
  const height = unit * (.24 + .08 * formation.extent), gap = radius * .35 * formation.aspect;
  ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter';
  const glowRadius = Math.max(24, unit * .13);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
  glow.addColorStop(0, `rgba(144,225,255,${formation.charge * .17})`);
  glow.addColorStop(.35, `rgba(23,129,227,${formation.charge * .10})`);
  glow.addColorStop(1, 'rgba(23,129,227,0)');
  ctx.fillStyle = glow; ctx.fillRect(-glowRadius, -glowRadius, glowRadius * 2, glowRadius * 2);
  // A fracture front travels from the impact point into both ends and then
  // outward through the glass facets. It reveals the existing geometry,
  // rather than stretching all the shards into existence simultaneously.
  const growth = formation.crack;
  ctx.save(); ctx.beginPath();
  ctx.ellipse(0, 0, 3 + Math.min(140, unit * .27) * growth ** 1.5, 2 + height * 1.14 * growth, 0, 0, Math.PI * 2);
  ctx.clip();
  const edgeAt = (u: number, side: number) => {
    const envelope = Math.sin(u * Math.PI);
    const grain = Math.sin(u * 73 + side * 2) * 1.8 + Math.sin(u * 149 + side) * .7;
    return side * (gap * envelope + 2.5) + (Math.sin(u * 18) * 3.5 + grain) * envelope;
  };
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // Irregular connected facets read as shattered glass, with transparent faces
  // and doubled reflective edges. Scroll separates them; ambient only glints.
  const count = unit < 500 ? 11 : 15;
  const reveal = Math.min(1, formation.charge * 2 + formation.seam);
  const spread = formation.aspect * Math.min(12, unit * .02);
  const shard = (a: number[], b: number[], c: number[], seed: number) => {
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
    const move = Math.sign(cx) * spread * (.3 + .7 * Math.sin(seed * 7.3) ** 2);
    const point = (p: number[]) => [cx + (p[0] - cx) * .97 + move, cy + (p[1] - cy) * .97];
    const aa = point(a), bb = point(b), cc = point(c);
    const face = new Path2D(); face.moveTo(aa[0], aa[1]); face.lineTo(bb[0], bb[1]); face.lineTo(cc[0], cc[1]); face.closePath();
    const reflection = ctx.createLinearGradient(aa[0], aa[1], bb[0] + .1, bb[1] + .1);
    reflection.addColorStop(0, '#6f68ae'); reflection.addColorStop(.46, '#142039');
    reflection.addColorStop(.52, '#c6dcf5'); reflection.addColorStop(1, '#423469');
    ctx.globalAlpha = formation.seam * (.07 + .05 * Math.sin(seed * 3.8) ** 2);
    ctx.fillStyle = reflection; ctx.fill(face);
    ctx.globalAlpha = formation.seam * .30; ctx.strokeStyle = '#9a9bcf'; ctx.lineWidth = .55; ctx.stroke(face);
    const glint = (.5 + .5 * Math.sin(seed * 5.7 + time * .8)) ** 6;
    ctx.globalAlpha = formation.seam * (.24 + glint * .35);
    ctx.strokeStyle = '#dceafa'; ctx.lineWidth = .65;
    ctx.beginPath(); ctx.moveTo(aa[0], aa[1]); ctx.lineTo(bb[0], bb[1]); ctx.stroke();
    ctx.globalAlpha *= .24; ctx.lineWidth = 2.5; ctx.stroke();
  };
  for (const side of [-1, 1]) {
    const inner: number[][] = [], middle: number[][] = [], outer: number[][] = [];
    for (let i = 0; i <= count; i++) {
      const u = .035 + i / count * .93;
      const yNode = (u * 2 - 1) * height;
      const reach = Math.min(78, unit * .14) * reveal * (.45 + .55 * Math.sin(i * 13.4 + side * 2) ** 2);
      const xNode = edgeAt(u, side);
      inner.push([xNode, yNode]);
      middle.push([xNode + side * reach * .47, yNode + Math.sin(i * 4.7 + side) * height / count * .6]);
      outer.push([xNode + side * reach, yNode + Math.sin(i * 7.3 + side * 3) * height / count * .9]);
    }
    for (let i = 0; i < count; i++) {
      const seed = i + side * 19;
      shard(inner[i], middle[i], inner[i + 1], seed);
      shard(inner[i + 1], middle[i], middle[i + 1], seed + .3);
      if (i % 3 !== 0) shard(middle[i], outer[i], middle[i + 1], seed + .6);
    }
  }
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const u = i / 96, yy = (u * 2 - 1) * height;
      const xx = edgeAt(u, side);
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.globalAlpha = formation.seam * .15;
    ctx.strokeStyle = side < 0 ? '#9aaaff' : '#d6a2ff';
    ctx.lineWidth = 7; ctx.stroke();
    ctx.globalAlpha = formation.seam * .38; ctx.lineWidth = 2.1; ctx.stroke();
    ctx.globalAlpha = formation.seam * .74; ctx.lineWidth = .65; ctx.stroke();
    for (let i = 0; i < 32; i++) {
      const u = (i + .5) / 32, yy = (u * 2 - 1) * height;
      const pulse = (.5 + .5 * Math.sin(u * 24 - time * 1.7 + side)) ** 5;
      const size = .35 + pulse * .85;
      ctx.globalAlpha = formation.seam * (.18 + pulse * .65) * Math.sin(u * Math.PI);
      ctx.fillStyle = '#eef1ff'; ctx.beginPath(); ctx.ellipse(edgeAt(u, side), yy, size, size * 1.7, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Local double discharges jump across the glass before the portal exists.
  for (let bolt = 0; bolt < 5; bolt++) {
    const phase = ((time + bolt * .173) % .93 + .93) % .93;
    const flash = phase < .075 ? Math.sin(phase / .075 * Math.PI) ** 2
      : phase > .13 && phase < .18 ? Math.sin((phase - .13) / .05 * Math.PI) ** 2 * .6 : 0;
    if (flash < .001) continue;
    const side = bolt % 2 ? 1 : -1, u = .14 + bolt * .17;
    const base = edgeAt(u, side), yy = (u * 2 - 1) * height;
    const reach = Math.min(104, unit * .19) * (.6 + bolt * .07);
    ctx.beginPath(); ctx.moveTo(base, yy);
    for (let node = 1; node <= 12; node++) {
      const t = node / 12;
      ctx.lineTo(base + side * reach * t, yy + reach * (.34 * Math.sin(node * 13.7 + bolt * 5) * Math.sin(t * Math.PI) + t * (bolt % 3 - 1) * .6));
    }
    ctx.globalAlpha = formation.seam * flash * .15; ctx.strokeStyle = '#9678ff'; ctx.lineWidth = 6; ctx.stroke();
    ctx.globalAlpha = formation.seam * flash * .9; ctx.strokeStyle = '#d9edff'; ctx.lineWidth = .8; ctx.stroke();
  }
  // Short tendrils and droplets stay attached to the tear instead of forming an icon.
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, u = (i + .5) / 18;
    const phase = (time * .22 + i * .381) % 1;
    const yy = (u * 2 - 1) * height, edge = side * gap * Math.sin(u * Math.PI);
    const reach = (12 + (i * 17 % 37)) * (1 - phase);
    ctx.globalAlpha = energy * Math.sin(phase * Math.PI) ** 2 * .38;
    ctx.strokeStyle = side < 0 ? '#78dce7' : '#bc8dff'; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(edge, yy);
    ctx.quadraticCurveTo(edge + side * reach * .7, yy - 9, edge + side * reach, yy + Math.sin(i * 2.4) * 18); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(edge + side * reach - .65, yy + Math.sin(i * 2.4) * 18 - .65, 1.3, 1.3);
  }
  ctx.restore();
  // Bright, short-lived tips mark the moving front, before it settles.
  if (growth > .01 && growth < .99) {
    ctx.globalAlpha = formation.seam * (1 - growth) * .7;
    ctx.fillStyle = '#dce6ff';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(0, side * height * growth, 1.2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Soft-edged caustic sheet, projected onto the physical cylinder rather than the lens. */
export function introGasTexture() {
  if (cloud) return cloud;
  cloud = document.createElement('canvas'); cloud.width = cloud.height = 128;
  const ctx = cloud.getContext('2d')!, pixels = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const r = Math.hypot((x - 64) / 64, (y - 64) / 64);
    const p = liquidPigment(x / 128 * 6, y / 128 * 4), i = (y * 128 + x) * 4;
    pixels.data[i] = p.r * 1.7; pixels.data[i + 1] = p.g * 1.7; pixels.data[i + 2] = p.b * 1.7;
    pixels.data[i + 3] = Math.max(0, 1 - r) ** .7 * 220;
  }
  ctx.putImageData(pixels, 0, 0); return cloud;
}
