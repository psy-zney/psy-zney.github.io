import { smooth } from '../data/virgoFlight';
import { OPENING_EDGES, OPENING_STARS } from '../data/virgoOpening';
import { INTRO_CONSTELLATION_COMPLETE, INTRO_PALETTE, introFrame } from '../data/virgoIntro';
import { drawIntroVortex } from './virgoIntroVortex';
import { drawIntroTunnel, introAperture } from './virgoIntroTunnel';

const random = (i: number) => { const n = Math.sin(i * 127.1 + 31.7) * 43758.5453; return n - Math.floor(n); };
const sky = Array.from({ length: 640 }, (_, i) => ({ x: random(i * 3), y: random(i * 3 + 1), size: .4 + random(i * 3 + 2) * 1.1 }));

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [parseInt(clean[0] + clean[0], 16), parseInt(clean[1] + clean[1], 16), parseInt(clean[2] + clean[2], 16)];
  }
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function drawStarPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  baseSize: number,
  colorHex: string,
  isCore: boolean,
  isMain: boolean,
  alpha: number,
  time = 0,
  idx = 0
) {
  if (alpha <= 0.001) return;
  const [r, g, b] = hexToRgb(colorHex);
  const pulse = 1 + 0.07 * Math.sin(time * 2.8 + idx * 1.5);

  // 1. Quầng hào quang tỏa xa mềm mại
  const auraRadius = (isCore ? 38 : isMain ? 24 : 14) * (baseSize / 1.8) * pulse;
  const aura = ctx.createRadialGradient(x, y, 0, x, y, auraRadius);
  aura.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * alpha})`);
  aura.addColorStop(0.22, `rgba(${r}, ${g}, ${b}, ${0.25 * alpha})`);
  aura.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${0.06 * alpha})`);
  aura.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Vầng hào quang sáng trung tâm (Corona)
  const coronaRadius = (isCore ? 12 : isMain ? 7 : 4) * pulse;
  const corona = ctx.createRadialGradient(x, y, 0, x, y, coronaRadius);
  corona.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
  corona.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${0.85 * alpha})`);
  corona.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(x, y, coronaRadius, 0, Math.PI * 2);
  ctx.fill();

  // 3. Tia sao tinh tế (Diffraction spikes) cho sao chính & Spica
  if ((isCore || isMain) && alpha > 0.3) {
    const spikeLen = (isCore ? 14 : 8) * pulse;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 * alpha})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - spikeLen, y);
    ctx.lineTo(x + spikeLen, y);
    ctx.moveTo(x, y - spikeLen);
    ctx.lineTo(x, y + spikeLen);
    ctx.stroke();
  }

  // 4. Lõi sao trắng sáng rực rỡ (Stellar Core)
  const coreRadius = (isCore ? 2.5 : isMain ? 1.8 : 1.25) * (isCore ? pulse : 1);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
  ctx.fill();
}

/** The constellation stays fixed while a vortex opens at its central star. */
export function drawIntro(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, idleTime = 0, constellation = INTRO_CONSTELLATION_COMPLETE) {
  const frame = introFrame(seconds), { sky: black, gold, violet } = INTRO_PALETTE;
  ctx.clearRect(0, 0, width, height); ctx.fillStyle = black; ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / 26, height / 20);
  const point = (i: number) => ({ x: width * .5 + OPENING_STARS[i].position[0] * scale, y: height * .45 - OPENING_STARS[i].position[1] * scale });
  const core = point(1);
  const renderSky = () => {
    ctx.fillStyle = black; ctx.fillRect(-width * 2, -height, width * 4, height * 3);
    sky.forEach((star, i) => {
      const twinkle = 0.6 + 0.4 * Math.sin(idleTime * 2.5 + i * 1.7);
      ctx.fillStyle = violet;
      ctx.globalAlpha = star.size * 0.36 * twinkle;
      ctx.fillRect(star.x * width, star.y * height, star.size, star.size);
    });
    ctx.globalAlpha = 1;
    OPENING_EDGES.forEach(([a, b], index) => {
      const p = point(a), q = point(b), collapse = 0, pull = 0;
      const ax = p.x + (core.x - p.x) * pull, ay = p.y + (core.y - p.y) * pull;
      const bx = q.x + (core.x - q.x) * pull, by = q.y + (core.y - q.y) * pull;
      const [leading, trailing] = constellation.edges[index];
      ctx.strokeStyle = '#b8c9ee';
      ctx.globalAlpha = 0.34 * (1 - collapse);
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(ax + (bx - ax) * leading, ay + (by - ay) * leading);
      ctx.moveTo(bx, by); ctx.lineTo(bx + (ax - bx) * trailing, by + (ay - by) * trailing);
      ctx.stroke();
      for (const [x, y, amount] of [[ax + (bx - ax) * leading, ay + (by - ay) * leading, leading],
        [bx + (ax - bx) * trailing, by + (ay - by) * trailing, trailing]]) {
        if (amount > 0 && amount < 1 && collapse === 0) drawStarPoint(ctx, x, y, .6, '#a8dfff', false, false, .45);
      }
    });
    ctx.globalAlpha = 1;
    OPENING_STARS.forEach((star, i) => {
      const p = point(i), isCore = i === 1, size = star.main ? 2.6 : 1.5;
      const growth = isCore ? 1 + frame.charge * 2 : 1;
      const starColor = isCore ? gold : star.color || violet;
      const alpha = constellation.stars[i] * (isCore ? 1 : 1 - frame.charge);
      const pull = isCore ? 0 : frame.charge ** 2;
      const x = p.x + (core.x - p.x) * pull, y = p.y + (core.y - p.y) * pull;
      drawStarPoint(ctx, x, y, size * growth, starColor, isCore, star.main, alpha, idleTime, i);
    });
    ctx.globalAlpha = 1;
  };
  renderSky();
  if (seconds <= 0) return;
  const aperture = introAperture(width, height, seconds, core);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(aperture.x, aperture.y, aperture.radius, aperture.radius * .90, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = smooth(1.6, 3.4, seconds);
  drawIntroTunnel(ctx, width, height, seconds);
  ctx.restore();
  drawIntroVortex(ctx, aperture.x, aperture.y, aperture.outerRadius, -.12 + idleTime * .035 + seconds * .12);
}
