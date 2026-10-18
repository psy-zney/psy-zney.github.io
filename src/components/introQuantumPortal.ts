import { introPortalShot, introPortalShotProjection } from '../data/virgoIntro';

/** A visible thin shaft recedes along Z while the camera keeps its frontal view. */
export function drawPortalShot(ctx: CanvasRenderingContext2D, width: number, height: number, core: { x: number; y: number }, seconds: number) {
  const shot = introPortalShot(seconds);
  if (shot.opacity + shot.impact < .001) return;
  const projection = introPortalShotProjection(width, height, core, seconds);
  const { headX, headY, tailX, tailY, impactRadius } = projection;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (shot.opacity > .001 && shot.head > .001) {
    const beam = ctx.createLinearGradient(tailX, tailY, headX, headY);
    beam.addColorStop(0, 'rgba(132,65,255,0)'); beam.addColorStop(.4, '#a87aff'); beam.addColorStop(1, '#fff4ff');
    ctx.strokeStyle = beam; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(headX, headY);
    for (const [width, alpha] of [[7, .08], [3.5, .3], [1.2, .95]]) {
      ctx.lineWidth = width; ctx.globalAlpha = shot.opacity * alpha; ctx.stroke();
    }
  }
  if (shot.impact > .001) {
    const radius = impactRadius;
    const glow = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, radius);
    glow.addColorStop(0, '#fff7ff'); glow.addColorStop(.13, '#e1bcff');
    glow.addColorStop(.4, 'rgba(145,83,255,.45)'); glow.addColorStop(1, 'rgba(105,49,225,0)');
    ctx.globalAlpha = shot.impact; ctx.fillStyle = glow;
    ctx.fillRect(core.x - radius, core.y - radius, radius * 2, radius * 2);
  }
  ctx.restore();
}

/** A fixed, front-facing tear. Ambient changes light, never the aperture geometry. */
const harmonics = [[7, .014, 1.2], [13, .009, -.7], [29, .004, 2.1]];
export const quantumEdge = (angle: number) => .35 + harmonics.reduce((r, [frequency, amplitude, phase]) => r + amplitude * Math.sin(angle * frequency + phase), 0);
export const quantumEdgeGLSL = `float quantumEdge(float a){return .35${harmonics.map(([f, m, p]) => `+${m.toFixed(4)}*sin(a*${f.toFixed(1)}+(${p.toFixed(2)}))`).join('')};}`;

export function quantumAperturePath(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, aspect: number) {
  ctx.beginPath();
  for (let i = 0; i <= 256; i++) {
    const a = i / 256 * Math.PI * 2, r = radius * quantumEdge(a) / .35;
    const px = x + Math.cos(a) * r * aspect, py = y + Math.sin(a) * r * .9;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Canvas recovery keeps the same torn lip and outward violet filaments. */
export function drawQuantumCorona(ctx: CanvasRenderingContext2D, radius: number, time: number) {
  const opacity = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.save(); ctx.scale(1, 1 / .9);
  // The caller supplies the front-facing .9 Y aspect once.
  quantumAperturePath(ctx, 0, 0, radius * .35, 1);
  for (const [width, alpha, color] of [[.07, .15, '#6b2bd9'], [.026, .5, '#a875ff'], [.004, .95, '#f7e5ff']] as const) {
    ctx.lineWidth = Math.max(.65, radius * width); ctx.strokeStyle = color; ctx.globalAlpha = opacity * alpha; ctx.stroke();
  }
  ctx.restore();
  const count = ctx.canvas.width < 700 ? 110 : 210;
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996323, phase = (time * .34 + i * .61803399) % 1;
    const edge = quantumEdge(a), reach = .045 + .17 * (.5 + .5 * Math.sin(i * 17.1)) ** 3;
    ctx.globalAlpha = opacity * Math.sin(phase * Math.PI) * .5;
    ctx.strokeStyle = i % 5 === 0 ? '#a9dfff' : '#b68aff'; ctx.lineWidth = .6;
    ctx.beginPath();
    for (let j = 0; j <= 8; j++) {
      const u = j / 8, r = radius * (edge + reach * (u + phase * .2));
      const theta = a + Math.sin(u * 5 + i) * .025 * u + u * .05;
      const px = Math.cos(theta) * r, py = Math.sin(theta) * r;
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}
