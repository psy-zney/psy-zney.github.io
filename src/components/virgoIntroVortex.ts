import { introPortalFormation, introVortexAngle } from '../data/virgoIntro';
import { liquidPigment } from './liquidSurface';
import { drawIntroLiquid } from './IntroLiquidSurface';
import { drawQuantumCorona } from './introQuantumPortal';

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

export function drawIntroVortex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number, seconds = 0, quantum = false) {
  if (radius < 1 || radius * .33 > Math.hypot(ctx.canvas.width, ctx.canvas.height) * 1.2) return;
  const formation = introPortalFormation(seconds);
  if (formation.rim < .001) return;
  const dpr = ctx.getTransform().a;
  ctx.save(); ctx.globalAlpha *= formation.rim;
  if (drawIntroLiquid(ctx, ctx.canvas.width / dpr, ctx.canvas.height / dpr, seconds, time, { x, y, radius, quantum })) { ctx.restore(); return; }
  ctx.translate(x, y); ctx.scale(formation.aspect, .90); ctx.globalCompositeOperation = 'lighter';
  if (quantum) { drawQuantumCorona(ctx, radius, time); ctx.restore(); return; }
  vortexLayers().forEach((sheet, i) => {
    ctx.save(); ctx.rotate(introVortexAngle(.335 + i / (LAYERS - 1) * .665, time));
    ctx.drawImage(sheet, -radius, -radius, radius * 2, radius * 2); ctx.restore();
  });
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
