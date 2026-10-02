import { clamp, smooth } from "./virgoFlight";

export type RiftPoint = { x: number; y: number };
const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 41.7) * 43758.5453;
  return v - Math.floor(v);
};
const noise = (x: number, seed: number) => {
  const i = Math.floor(x), f = x - i;
  return (hash(i + seed) * (1 - f) + hash(i + seed + 1) * f) * 2 - 1;
};

/** Fit the opening to actual text ink, retaining just the tapered tips. */
export function readingRiftSize(textWidth: number, textHeight: number, viewportWidth: number) {
  const span = Math.min(viewportWidth - 16, textWidth + 76);
  return { span, halfGap: textHeight / 2 + 14, tip: Math.min(30, Math.max(4, (span - textWidth) * .35)) };
}

/** Multiscale, non-repeating tear margins; no glass panes or radial mesh. */
export function spaceRiftContour(width: number, halfGap: number, reveal: number, seed = 0, tip = 30) {
  const spread = smooth(0, .30, reveal);
  const aperture = smooth(.18, .82, reveal);
  const span = width * .5 * spread;
  const roughness = clamp(halfGap / 60, .28, 1);
  const taper = Math.min(.12, tip / Math.max(1, width));
  const bank = (side: number) => Array.from({ length: 193 }, (_, i) => {
    const t = i / 192;
    const envelope = smooth(0, taper, t) * (1 - smooth(1 - taper, 1, t));
    const root = noise(t * 9, seed + 13) * 6 * roughness;
    const rag = Math.max(-7, noise(t * 13, seed + side * 43) * 16 + noise(t * 47, seed + side * 71) * 12 + noise(t * 113, seed + side * 97) * 6) * roughness;
    return { x: (t * 2 - 1) * span,
      y: root * envelope + side * (halfGap * aperture * envelope + (1.5 + aperture * rag) * envelope) };
  });
  const top = bank(-1), bottom = bank(1);
  return { top, bottom, polygon: [...top, ...bottom.slice().reverse()], aperture, spread };
}

export function spaceRiftFrame(position: number, reduced = false) {
  return { active: position >= .70 && position < 1.82,
    glow: reduced ? 0 : smooth(.70, .95, position) * (1 - smooth(1.60, 1.82, position)) };
}

export const RIFT_PARTICLES = Array.from({ length: 52 }, (_, i) => ({
  x: hash(i + 13) * 2 - 1, side: i % 2 ? 1 : -1,
  phase: hash(i + 371), speed: .08 + hash(i + 731) * .11,
  size: .3 + hash(i + 931) * 1.1,
}));
export const RIFT_BRANCHES = Array.from({ length: 9 }, (_, i) => ({
  x: (i / 8 - .5) * 1.5, side: i % 2 ? 1 : -1,
  length: 12 + hash(i + 821) * 33, bend: (hash(i + 391) - .5) * 28,
  arrival: clamp(Math.abs(i / 8 - .5) * 1.6),
}));
