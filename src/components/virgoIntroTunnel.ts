import { introFrame, introTunnelView, projectTunnelWall } from '../data/virgoIntro';
import { smooth } from '../data/virgoFlight';
import { introGasTexture } from './virgoIntroVortex';

const random = (i: number) => { const n = Math.sin(i * 127.1 + 31.7) * 43758.5453; return n - Math.floor(n); };
const dust = Array.from({ length: 960 }, (_, i) => ({ theta: random(i * 3) * Math.PI * 2,
  z: 1200 - random(i * 3 + 1) * 10200, size: .5 + random(i * 3 + 2), inset: .96 + random(i + 4000) * .09 }));

/** World-space mesh and helical gas share the same cylinder. */
export function drawIntroTunnel(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number) {
  const frame = introFrame(seconds), view = introTunnelView(width, height);
  const wash = ctx.createRadialGradient(width * .53, height * .51, 20, width * .53, height * .51, Math.max(width, height) * .7);
  wash.addColorStop(0, '#010307'); wash.addColorStop(.24, '#03101c');
  wash.addColorStop(.65, '#04131e'); wash.addColorStop(1, '#010409');
  ctx.fillStyle = wash; ctx.fillRect(0, 0, width, height);

  // Eighteen hoops, with enough world depth to keep the far mouth visible at arrival.
  ctx.beginPath();
  for (let ring = 0; ring < 18; ring++) {
    const z = 1200 - ring * 550;
    if (frame.z - z < 100) continue;
    for (let step = 0; step <= 96; step++) {
      const p = projectTunnelWall(view, frame, step / 96 * Math.PI * 2, z);
      if (step === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
  }
  // Twenty meridians bend with the same cylinder as the hoops and captions.
  for (let rail = 0; rail < 20; rail++) {
    let first = true;
    for (let depth = 120; depth <= 10000; depth += 160) {
      const p = projectTunnelWall(view, frame, rail / 20 * Math.PI * 2, frame.z - depth);
      if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
    }
  }
  // Two batched strokes replace dozens of full-canvas shadow blurs per frame.
  ctx.lineWidth = 3; ctx.strokeStyle = '#47b7cf'; ctx.globalAlpha = .09; ctx.stroke();
  ctx.lineWidth = .6; ctx.strokeStyle = '#a2d6e5'; ctx.globalAlpha = .30; ctx.stroke();

  const gas = introGasTexture();
  ctx.globalAlpha = .65;
  for (let i = 0; i < 108; i++) {
    const z = 900 - Math.floor(i / 6) * 540;
    if (frame.z - z < 180) continue;
    const theta = i % 6 * Math.PI / 3 + z / 920 + seconds * .045;
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
    for (let strand = 0; strand < 12; strand++) {
      let first = true;
      for (let z = 1000; z >= -9000; z -= 90) {
        if (frame.z - z < 100) continue;
        const theta = strand * Math.PI / 6 + z / 920 + layer * .15 + seconds * .045;
        const p = projectTunnelWall(view, frame, theta, z, .98 + layer * .015);
        if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
      }
    }
    ctx.lineWidth = [14, 4, .8][layer]; ctx.globalAlpha = [.035, .13, .6][layer];
    ctx.strokeStyle = ['#1372aa', '#159bd1', '#b5f5ff'][layer]; ctx.stroke();
  }

  // Dust occupies the surface, with tiny orbital drift and no radial star tails.
  for (let color = 0; color < 3; color++) {
    ctx.fillStyle = ['#bcd9e4', '#62b4cd', '#f0f5ff'][color];
    ctx.globalAlpha = [.32, .42, .60][color];
    for (let i = color; i < dust.length; i += 3) {
      const star = dust[i];
      const p = projectTunnelWall(view, frame, star.theta + seconds * .018, star.z, star.inset);
      if (p.depth < 120 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) continue;
      const size = Math.min(1.7, Math.max(.55, star.size * view.focal / p.depth));
      ctx.fillRect(p.x, p.y, size, size);
    }
  }
  ctx.globalAlpha = 1;
  const farZ = 1200 - 17 * 550;
  const edgeA = projectTunnelWall(view, frame, 0, farZ), edgeB = projectTunnelWall(view, frame, Math.PI, farZ);
  const cx = (edgeA.x + edgeB.x) / 2, cy = (edgeA.y + edgeB.y) / 2;
  const mouth = view.radius * view.focal / (frame.z - farZ);
  const depthFade = ctx.createRadialGradient(cx, cy, mouth * .75, cx, cy, mouth * 1.8);
  depthFade.addColorStop(0, '#010307'); depthFade.addColorStop(1, '#01030700');
  ctx.fillStyle = depthFade;
  ctx.fillRect(cx - mouth * 2, cy - mouth * 2, mouth * 4, mouth * 4);
}

/** A small circular rift widens into the tunnel; no splitting screen or camera roll. */
export function introAperture(width: number, height: number, seconds: number, core: { x: number; y: number }) {
  const opening = smooth(0, 2.75, seconds), entry = smooth(2.75, 3.8, seconds);
  const radius = Math.min(width, height) * (.008 + .62 * opening) + Math.hypot(width, height) * 3 * entry;
  return { x: core.x + (width / 2 - core.x) * entry, y: core.y + (height / 2 - core.y) * entry,
    radius: radius * .35, outerRadius: radius, opening, entry };
}
