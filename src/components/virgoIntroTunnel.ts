import { INTRO_ENTRANCE_Z, introFrame, introPortalFormation, introTunnelView, introVortexAngle, projectTunnelWall } from '../data/virgoIntro';
import { smooth } from '../data/virgoFlight';
import { drawIntroVortex, introGasTexture } from './virgoIntroVortex';
import { drawIntroLiquid } from './IntroLiquidSurface';

const random = (i: number) => { const n = Math.sin(i * 127.1 + 31.7) * 43758.5453; return n - Math.floor(n); };
const dust = Array.from({ length: 960 }, (_, i) => ({ theta: random(i * 3) * Math.PI * 2,
  z: 1200 - random(i * 3 + 1) * 10200, size: .5 + random(i * 3 + 2), inset: .96 + random(i + 4000) * .09 }));

/** Continuous liquid follows the existing physical cylinder and fixed camera. */
export function drawIntroTunnel(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, time = seconds) {
  const frame = introFrame(seconds), view = introTunnelView(width, height);
  const wash = ctx.createRadialGradient(width * .53, height * .51, 20, width * .53, height * .51, Math.max(width, height) * .7);
  wash.addColorStop(0, '#010307'); wash.addColorStop(.24, '#03101c');
  wash.addColorStop(.65, '#04131e'); wash.addColorStop(1, '#010409');
  ctx.fillStyle = wash; ctx.fillRect(0, 0, width, height);

  // Canvas recovery uses broad overlapping sheets instead of wire helices.
  if (!drawIntroLiquid(ctx, width, height, seconds, time)) {
    const gas = introGasTexture();
    ctx.save(); ctx.globalAlpha = .9; ctx.globalCompositeOperation = 'lighter';
    for (let i = 239; i >= 0; i--) {
      const z = 900 - Math.floor(i / 8) * 340;
      if (frame.z - z < 180) continue;
      const theta = i % 8 * Math.PI / 4 + z / 1400 + introVortexAngle(1, time) + Math.sin(z / 700 + time * .2) * .14;
      const front = Math.min(z + 350, frame.z - 100);
      const a = projectTunnelWall(view, frame, theta - .58, front);
      const b = projectTunnelWall(view, frame, theta + .58, front);
      const c = projectTunnelWall(view, frame, theta - .58, z - 350);
      if (Math.max(a.x, b.x, c.x) < -100 || Math.min(a.x, b.x, c.x) > width + 100) continue;
      ctx.save();
      ctx.transform((b.x - a.x) / 128, (b.y - a.y) / 128, (c.x - a.x) / 128, (c.y - a.y) / 128, a.x, a.y);
      ctx.drawImage(gas, 0, 0); ctx.restore();
    }
    ctx.restore();
  }

  // Dust occupies the surface, with tiny orbital drift and no radial star tails.
  for (let color = 0; color < 3; color++) {
    ctx.fillStyle = ['#c39bff', '#78dce7', '#e5eaff'][color];
    ctx.globalAlpha = [.32, .42, .60][color];
    for (let i = color; i < dust.length; i += 3) {
      const star = dust[i];
      const p = projectTunnelWall(view, frame, star.theta + time * .03, star.z, star.inset);
      if (p.depth < 120 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) continue;
      const size = Math.min(1.7, Math.max(.55, star.size * view.focal / p.depth));
      ctx.fillRect(p.x, p.y, size, size);
    }
  }
  ctx.globalAlpha = 1;
}

/** Fixed-size world-space entrance. Growth after opening comes only from camera translation. */
export function introAperture(width: number, height: number, seconds: number, core: { x: number; y: number }) {
  const frame = introFrame(seconds), view = introTunnelView(width, height);
  const formation = introPortalFormation(seconds);
  const opening = smooth(0, 2.75, seconds), entry = smooth(1000, INTRO_ENTRANCE_Z, frame.z);
  const worldRadius = Math.min(width, height) * (.008 + .452 * formation.extent) * (1000 - INTRO_ENTRANCE_Z) / view.focal;
  const depth = frame.z - INTRO_ENTRANCE_Z, crossed = depth <= 0;
  const outerRadius = crossed ? 0 : worldRadius * view.focal / Math.max(1, depth);
  const alignment = Math.max(entry, formation.alignment);
  return { x: core.x + (width / 2 - core.x) * alignment, y: core.y + (height / 2 - core.y) * alignment,
    radius: crossed ? Math.hypot(width, height) * 2 : outerRadius * .35,
    outerRadius, worldRadius, depth, crossed, opening, entry, aspect: formation.aspect };
}

/** Cut a real opening through the overlay to the prepared Home scene, then cross it. */
export function drawIntroExit(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, time: number) {
  const frame = introFrame(seconds), view = introTunnelView(width, height);
  const physicalRadius = view.radius * view.focal / Math.max(1, frame.exitDepth);
  const radius = physicalRadius * frame.exitReveal;
  const x = width / 2, y = height / 2;
  if (frame.z > INTRO_ENTRANCE_Z) return { x, y, radius: 0, reveal: 0, crossed: false };
  // The opaque liquid already covers Home. Keep its vanishing point visible;
  // only cut through the surface when the physical exit is close enough.
  if (radius > 0) {
    const opening = ctx.createRadialGradient(x, y, radius * .94, x, y, radius * 1.02);
    opening.addColorStop(0, '#000'); opening.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = opening; ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(0, 0, width, height); ctx.restore();
  }
  if (frame.exitDepth > 0 && radius > 1 && radius < Math.hypot(width, height)) {
    drawIntroVortex(ctx, x, y, radius / .35, time, seconds);
  }
  return { x, y, radius, reveal: frame.exitReveal, crossed: frame.exitDepth <= 0 };
}
