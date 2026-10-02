import type { CosmicEffect } from "../data/virgoNarrative";
import { smooth } from "../data/virgoFlight";
import { readingRiftSize, spaceRiftContour, type RiftPoint } from "../data/virgoSpaceRift";

type ReadingRift = { reveal: number; width: number; height: number; x: number; y: number; seed: number; effect: CosmicEffect };
const trace = (ctx: CanvasRenderingContext2D, points: RiftPoint[]) => {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
};
const noise = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453;
  return n - Math.floor(n);
};

/** A short spatial accent resolves into a quiet reading surface. All motion is reversible. */
export class VirgoSpaceRiftRenderer {
  private ctx: CanvasRenderingContext2D | null;
  private width = 0;
  private height = 0;
  private drawn = false;
  private previousKey = "";
  constructor(private canvas: HTMLCanvasElement) { this.ctx = canvas.getContext("2d", { alpha: true }); }

  update(position: number, reduced: boolean, paused: boolean, reading?: ReadingRift) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (reduced || !reading || reading.reveal < .001) {
      if (this.drawn) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.width, this.height); this.drawn = false; }
      this.previousKey = ""; return;
    }
    if (paused && this.drawn) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const density = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (rect.width * rect.height)));
    const width = Math.round(rect.width * density), height = Math.round(rect.height * density);
    const key = [position, reading.reveal, reading.width, reading.height, reading.x, reading.y, reading.seed, reading.effect, width, height].join("|");
    if (key === this.previousKey) return;
    this.previousKey = key;
    if (width !== this.width || height !== this.height) {
      this.width = this.canvas.width = width; this.height = this.canvas.height = height;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, width, height);
    this.drawn = true;
    ctx.setTransform(density, 0, 0, density, reading.x * density, reading.y * density);
    const { span, halfGap, tip } = readingRiftSize(reading.width, reading.height, rect.width);
    const amount = reading.reveal;
    const pulse = Math.sin(Math.PI * amount);
    const spread = smooth(0, .78, amount);
    const energy = smooth(0, .15, amount) * (reading.effect === "rift" ? pulse * .90 : .05 + pulse * .80);
    const radius = span / 2 * spread;
    const gap = halfGap + 8;

    if (reading.effect === "rift") {
      const contour = spaceRiftContour(span, halfGap, amount, reading.seed * 109, tip);
      ctx.beginPath(); contour.polygon.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
      ctx.fillStyle = `rgba(1,4,10,${pulse * .38})`; ctx.fill();
      ctx.globalCompositeOperation = "screen";
      for (const bank of [contour.top, contour.bottom]) {
        const light = ctx.createLinearGradient(-radius, 0, radius, 0);
        light.addColorStop(0, "rgba(105,153,208,0)"); light.addColorStop(.3, `rgba(163,200,233,${energy})`);
        light.addColorStop(.7, `rgba(154,176,219,${energy * .7})`); light.addColorStop(1, "rgba(105,153,208,0)");
        trace(ctx, bank); ctx.strokeStyle = light; ctx.lineWidth = .6 + pulse * .7;
        ctx.shadowColor = "#6a91bc"; ctx.shadowBlur = pulse * 16; ctx.lineJoin = "round"; ctx.stroke();
      }
      ctx.shadowBlur = 0;
    } else {
      ctx.globalCompositeOperation = "screen";
      if (reading.effect === "nebula" || reading.effect === "aurora") {
        const center = reading.effect === "nebula" ? -radius * .55 : radius * .48;
        const haze = ctx.createRadialGradient(center, -gap, 0, center, -gap, Math.max(1, span * .32));
        haze.addColorStop(0, `rgba(93,130,166,${energy * .17})`); haze.addColorStop(.45, `rgba(98,101,153,${energy * .07})`);
        haze.addColorStop(1, "rgba(69,97,139,0)"); ctx.fillStyle = haze;
        ctx.fillRect(-span, -span * .45, span * 2, span * .9);
      }
      if (reading.effect === "meteor") {
        const head = -radius + radius * 2 * smooth(0, 1, amount);
        const tail = ctx.createLinearGradient(head - radius * .65, -gap, head, -gap);
        tail.addColorStop(0, "rgba(137,173,213,0)"); tail.addColorStop(1, `rgba(190,215,239,${energy})`);
        ctx.strokeStyle = tail; ctx.lineWidth = .9;
        ctx.beginPath(); ctx.moveTo(head - radius * .65, -gap - 5); ctx.quadraticCurveTo(head - radius * .3, -gap - 2, head, -gap); ctx.stroke();
        ctx.fillStyle = `rgba(220,234,248,${energy})`; ctx.beginPath(); ctx.arc(head, -gap, 1.3, 0, Math.PI * 2); ctx.fill();
      } else if (reading.effect === "orbit") {
        const arc: RiftPoint[] = [];
        for (let i = 0; i <= 80; i++) {
          const t = i / 80 * spread;
          arc.push({ x: (t * 2 - 1) * radius, y: -gap - Math.sin(t * Math.PI) * 15 });
        }
        const light = ctx.createLinearGradient(-radius, 0, radius, 0);
        light.addColorStop(0, "rgba(132,172,211,0)"); light.addColorStop(.5, `rgba(155,192,225,${energy * .65})`);
        light.addColorStop(1, "rgba(132,172,211,0)"); trace(ctx, arc); ctx.strokeStyle = light; ctx.lineWidth = .65; ctx.stroke();
      } else if (reading.effect === "aurora") {
        for (let layer = 0; layer < 3; layer++) {
          const curtain: RiftPoint[] = [];
          for (let i = 0; i <= 70; i++) {
            const t = i / 70;
            curtain.push({ x: t * radius, y: -gap - 4 - layer * 4 - Math.sin(t * 5 + amount + layer * .25) * Math.sin(t * Math.PI) * 10 });
          }
          trace(ctx, curtain); ctx.strokeStyle = `rgba(134,179,184,${energy * .14})`; ctx.lineWidth = 2 - layer * .4; ctx.stroke();
        }
      }
    }
    for (let i = 0; i < 22; i++) {
      const x = (noise(i + reading.seed * 47) * 2 - 1) * radius;
      const y = -gap - 8 - noise(i + 68) * 24 * (1 - amount);
      ctx.fillStyle = `rgba(174,199,223,${energy * (.12 + noise(i + 31) * .34)})`;
      ctx.fillRect(x, y, i % 6 ? .7 : 1.2, i % 6 ? .7 : 1.2);
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }
  dispose() {
    this.ctx?.clearRect(0, 0, this.width, this.height);
    this.canvas.width = this.canvas.height = 1; this.ctx = null;
  }
}
