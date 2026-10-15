import { INTRO_ENTRANCE_Z, INTRO_TUNNEL_GRID, introFrame, introTunnelView, projectTunnelWall } from '../data/virgoIntro';
import { smooth } from '../data/virgoFlight';
import { drawIntroVortex, introGasTexture } from './virgoIntroVortex';

const random = (i: number) => { const n = Math.sin(i * 127.1 + 31.7) * 43758.5453; return n - Math.floor(n); };
const dust = Array.from({ length: 960 }, (_, i) => ({ theta: random(i * 3) * Math.PI * 2,
  z: 1200 - random(i * 3 + 1) * 10200, size: .5 + random(i * 3 + 2), inset: .96 + random(i + 4000) * .09 }));

/** World-space mesh and helical gas share the same cylinder. */
export function drawIntroTunnel(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, time = seconds) {
  const frame = introFrame(seconds), view = introTunnelView(width, height);
  const wash = ctx.createRadialGradient(width * .53, height * .51, 20, width * .53, height * .51, Math.max(width, height) * .7);
  wash.addColorStop(0, '#010307'); wash.addColorStop(.24, '#03101c');
  wash.addColorStop(.65, '#04131e'); wash.addColorStop(1, '#010409');
  ctx.fillStyle = wash; ctx.fillRect(0, 0, width, height);

  // The virtual 18 × 20 grid places effects; its wireframe is never painted.
  const gas = introGasTexture();
  ctx.globalAlpha = .65;
  for (let i = 0; i < 108; i++) {
    const z = 900 - Math.floor(i / 6) * INTRO_TUNNEL_GRID.spacing;
    if (frame.z - z < 180) continue;
    const theta = i % 6 * Math.PI / 3 + z / 920 + time * .12;
    const a = projectTunnelWall(view, frame, theta - .25, z + 130);
    const b = projectTunnelWall(view, frame, theta + .25, z + 130);
    const c = projectTunnelWall(view, frame, theta - .25, z - 130);
    if (Math.max(a.x, b.x, c.x) < -100 || Math.min(a.x, b.x, c.x) > width + 100) continue;
    ctx.save();
    ctx.transform((b.x - a.x) / 128, (b.y - a.y) / 128, (c.x - a.x) / 128, (c.y - a.y) / 128, a.x, a.y);
    ctx.drawImage(gas, 0, 0); ctx.restore();
  }

  // Layered spiral filaments wind along the wall, rather than across the lens.
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    for (let strand = 0; strand < 6; strand++) {
      let first = true;
      for (let z = 1000; z >= -9000; z -= 90) {
        if (frame.z - z < 100) continue;
        const theta = strand * Math.PI / 3 + z / 920 + layer * .15 + time * .12 + .055 * Math.sin(z * .014 + strand * 1.7 + time * .35);
        const p = projectTunnelWall(view, frame, theta, z, .98 + layer * .015);
        if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
      }
    }
    ctx.lineWidth = [18, 4, .8][layer]; ctx.globalAlpha = [.045, .10, .23][layer];
    ctx.strokeStyle = ['#1372aa', '#159bd1', '#b5f5ff'][layer]; ctx.stroke();
  }

  // Dust occupies the surface, with tiny orbital drift and no radial star tails.
  for (let color = 0; color < 3; color++) {
    ctx.fillStyle = ['#bcd9e4', '#62b4cd', '#f0f5ff'][color];
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
  const opening = smooth(0, 2.75, seconds), entry = smooth(1000, INTRO_ENTRANCE_Z, frame.z);
  const worldRadius = Math.min(width, height) * (.008 + .452 * opening) * (1000 - INTRO_ENTRANCE_Z) / view.focal;
  const depth = frame.z - INTRO_ENTRANCE_Z, crossed = depth <= 0;
  const outerRadius = crossed ? 0 : worldRadius * view.focal / Math.max(1, depth);
  return { x: core.x + (width / 2 - core.x) * entry, y: core.y + (height / 2 - core.y) * entry,
    radius: crossed ? Math.hypot(width, height) * 2 : outerRadius * .35,
    outerRadius, worldRadius, depth, crossed, opening, entry };
}

/** Cut a real opening through the overlay to the prepared Home scene, then cross it. */
export function drawIntroExit(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, time: number) {
  const frame = introFrame(seconds), view = introTunnelView(width, height);
  const physicalRadius = view.radius * view.focal / Math.max(1, frame.exitDepth);
  const radius = physicalRadius * frame.exitReveal;
  const rimRadius = physicalRadius * (.35 + .65 * frame.exitReveal);
  const x = width / 2, y = height / 2;
  if (frame.z > INTRO_ENTRANCE_Z) return { x, y, radius: 0, reveal: 0, crossed: false };
  // The distant end stays opaque black throughout wall reading. Home is prepared
  // behind it, but only becomes visible as the near exit actually opens.
  ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(x, y, rimRadius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (frame.exitDepth > 0 && frame.exitDepth < 1100 && rimRadius < Math.hypot(width, height)) {
    ctx.save(); ctx.globalAlpha = smooth(1100, 650, frame.exitDepth);
    drawIntroVortex(ctx, x, y, rimRadius / .35, -time); ctx.restore();
  }
  return { x, y, radius, reveal: frame.exitReveal, crossed: frame.exitDepth <= 0 };
}
