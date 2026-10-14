import { OPENING_EDGES, OPENING_STARS } from '../data/virgoOpening';
import { INTRO_PALETTE, introFrame } from '../data/virgoIntro';
import { smooth } from '../data/virgoFlight';

const random = (i: number) => { const n = Math.sin(i * 127.1 + 31.7) * 43758.5453; return n - Math.floor(n); };
const sky = Array.from({ length: 640 }, (_, i) => ({ x: random(i * 3), y: random(i * 3 + 1), size: .4 + random(i * 3 + 2) * 1.1 }));
const dust = Array.from({ length: 620 }, (_, i) => ({ x: (random(i * 4) - .5) * 3000, y: (random(i * 4 + 1) - .5) * 2600, z: -random(i * 4 + 2) * 6600, size: .5 + random(i * 4 + 3) }));

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [parseInt(clean[0] + clean[0], 16), parseInt(clean[1] + clean[1], 16), parseInt(clean[2] + clean[2], 16)];
  }
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, strength = 1) {
  const [r, g, b] = hexToRgb(color);
  const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * strength})`);
  light.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${0.28 * strength})`);
  light.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${0.07 * strength})`);
  light.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = light;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
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

/** Frozen sky sheets move apart along an irregular 15-degree vertical seam.
 * Tunnel particles use perspective from the actual 1000 → -3000 camera path.
 */
export function drawIntro(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, idleTime = 0) {
  const frame = introFrame(seconds), { sky: black, gold, violet, rim } = INTRO_PALETTE;
  ctx.clearRect(0, 0, width, height); ctx.fillStyle = black; ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / 26, height / 20);
  const point = (i: number) => ({ x: width * .5 + OPENING_STARS[i].position[0] * scale, y: height * .45 - OPENING_STARS[i].position[1] * scale });
  const core = point(1), gap = frame.tear ** 2 * width * 1.18;
  if (frame.tear > 0) {
    const focal = height * 0.88;
    const cx = width * 0.5 - frame.x * 0.12;
    const cy = height * 0.5 - frame.y * 0.12;
    const tunnelRadius = Math.min(width, height) * 0.72;

    // 1. Quầng năng lượng lượng tử sâu thẳm trong lòng ống hầm
    glow(ctx, cx, cy, Math.max(width, height) * 0.75, '#031738', 0.70 * frame.tear);
    glow(ctx, cx, cy, Math.max(width, height) * 0.45, '#004c82', 0.55 * frame.tear);
    glow(ctx, cx, cy, Math.max(width, height) * 0.22, '#00e5ff', 0.35 * frame.tear);

    // 2. Các vòng lượng tử đồng tâm (Concentric Quantum Rings) phân bổ theo chiều sâu
    const numRings = 18;
    for (let r = 0; r < numRings; r++) {
      const ringZ = 1200 - r * 250;
      const depth = frame.z - ringZ;
      if (depth < 25 || depth > 3800) continue;
      const pScale = focal / depth;
      const rx = tunnelRadius * pScale;
      const ry = tunnelRadius * 0.86 * pScale;
      const rcx = width / 2 - (frame.x * focal) / depth * 0.14;
      const rcy = height / 2 - (frame.y * focal) / depth * 0.14;

      const pulse = 0.5 + 0.5 * Math.sin(r * 0.85 - seconds * 10);
      const alpha = Math.min(1, 1400 / depth) * frame.tear * (0.45 + 0.55 * pulse);
      if (alpha <= 0.01) continue;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(rcx, rcy, rx, ry, -Math.PI / 32, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.2, 4.2 * pScale * (0.7 + 0.6 * pulse));
      ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.75})`;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = Math.min(24, 16 * pScale);
      ctx.stroke();

      ctx.lineWidth = Math.max(0.6, 1.4 * pScale);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Các tia sáng dọc thành ống (Longitudinal Energy Rails)
    const numRails = 20;
    for (let k = 0; k < numRails; k++) {
      const theta = (k / numRails) * Math.PI * 2;
      const isKeyRail = k % 4 === 0;
      ctx.save();
      ctx.beginPath();
      let started = false;
      for (let d = 75; d <= 2600; d += 130) {
        const pScale = focal / d;
        const twist = Math.sin(d * 0.0016 - seconds * 3.2) * 0.14;
        const angle = theta + twist;
        const px = (width / 2 - (frame.x * focal) / d * 0.14) + Math.cos(angle) * tunnelRadius * pScale;
        const py = (height / 2 - (frame.y * focal) / d * 0.14) + Math.sin(angle) * (tunnelRadius * 0.86) * pScale;
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      const railPulse = 0.5 + 0.5 * Math.sin(k * 1.5 + seconds * 8);
      ctx.lineWidth = isKeyRail ? 2.6 : 1.2;
      ctx.strokeStyle = isKeyRail
        ? `rgba(255, 255, 255, ${0.85 * frame.tear * railPulse})`
        : `rgba(0, 220, 255, ${0.48 * frame.tear * railPulse})`;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = isKeyRail ? 14 : 7;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Hạt bụi xoáy lượng tử theo mặt cong ống trụ (Vortex Star Dust)
    dust.forEach((star, i) => {
      const z = star.z + Math.max(0, seconds - 2.2) * 75;
      const depth = frame.z - z;
      if (depth < 20) return;
      const pScale = focal / depth;
      const twist = (depth * 0.0018 - seconds * 3.5);
      const r = (0.5 + 0.5 * (Math.hypot(star.x, star.y) / 1800)) * tunnelRadius * pScale;
      const angle = Math.atan2(star.y, star.x) + twist * 0.25;
      const x = (width / 2 - (frame.x * focal) / depth * 0.14) + Math.cos(angle) * r;
      const y = (height / 2 - (frame.y * focal) / depth * 0.14) + Math.sin(angle) * (r * 0.86);
      if (x < -100 || x > width + 100 || y < -100 || y > height + 100) return;

      const tail = 1 + frame.streak * Math.min(1.4, 240 / depth);
      ctx.globalAlpha = Math.min(.95, 1400 / depth) * frame.tear;
      ctx.strokeStyle = i % 6 === 0 ? '#ffffff' : i % 3 === 0 ? '#00f5ff' : '#38bdf8';
      ctx.lineWidth = Math.min(2.5, star.size * pScale);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(width / 2 + (x - width / 2) * tail, height / 2 + (y - height / 2) * tail);
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(x, y, Math.max(0.7, ctx.lineWidth), Math.max(0.7, ctx.lineWidth));
    });
    ctx.globalAlpha = 1;
  }
  const seam = Array.from({ length: 53 }, (_, i) => {
    const y = height * (i / 52 * 1.4 - .2);
    return { x: core.x + (y - core.y) * Math.tan(Math.PI / 12) + Math.sin(i * 2.7) * 5 * frame.tear, y };
  });
  const renderSky = () => {
    ctx.fillStyle = black; ctx.fillRect(-width * 2, -height, width * 4, height * 3);
    sky.forEach((star, i) => {
      const twinkle = 0.6 + 0.4 * Math.sin(idleTime * 2.5 + i * 1.7);
      ctx.fillStyle = violet;
      ctx.globalAlpha = star.size * 0.36 * twinkle;
      ctx.fillRect(star.x * width, star.y * height, star.size, star.size);
    });
    ctx.globalAlpha = 1;
    OPENING_EDGES.forEach(([a, b]) => {
      const p = point(a), q = point(b), collapse = frame.charge;
      const distance = Math.hypot(p.x - core.x, p.y - core.y);
      const endDistance = Math.hypot(q.x - core.x, q.y - core.y);
      const [far, near] = distance > endDistance ? [p, q] : [q, p];
      const x = far.x + (near.x - far.x) * collapse, y = far.y + (near.y - far.y) * collapse;
      const pull = collapse ** 2;
      ctx.strokeStyle = '#b8c9ee';
      ctx.globalAlpha = 0.48 * (1 - collapse);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x + (core.x - x) * pull, y + (core.y - y) * pull);
      ctx.lineTo(near.x + (core.x - near.x) * pull, near.y + (core.y - near.y) * pull);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    OPENING_STARS.forEach((star, i) => {
      const p = point(i), isCore = i === 1, size = star.main ? 2.6 : 1.5;
      const growth = isCore ? 1 + frame.charge * 2 : 1;
      const starColor = isCore ? gold : star.color || violet;
      const alpha = isCore ? 1 : 1 - frame.charge;
      const pull = isCore ? 0 : frame.charge ** 2;
      const x = p.x + (core.x - p.x) * pull, y = p.y + (core.y - p.y) * pull;
      drawStarPoint(ctx, x, y, size * growth, starColor, isCore, star.main, alpha, idleTime, i);
    });
    ctx.globalAlpha = 1;
  };
  if (!frame.tear) renderSky();
  else if (frame.tear < 1) {
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side * gap / 2, 0); ctx.beginPath();
      ctx.moveTo(side < 0 ? -width * 2 : width * 3, -height);
      seam.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(side < 0 ? -width * 2 : width * 3, height * 2); ctx.closePath(); ctx.clip(); renderSky(); ctx.restore();
      ctx.save(); ctx.translate(side * gap / 2, 0); ctx.strokeStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 24; ctx.lineWidth = 2.6 + frame.tear * 2.8;
      ctx.globalAlpha = smooth(1, 1.15, seconds) * (1 - smooth(2, 2.2, seconds));
      const reach = smooth(1, 1.65, seconds) * height * 1.4;
      ctx.beginPath(); ctx.rect(-width, core.y - reach, width * 3, reach * 2); ctx.clip();
      ctx.beginPath(); seam.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.restore();
    }
  }
}
