import { clamp, smooth } from "./virgoFlight";
import { openingTransition } from "./virgoOpening";

const seeded = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 61.7) * 43758.5453;
  return n - Math.floor(n);
};

export const FRACTURE_MOTION = {
  seedStart: .70, seedEnd: .94,
  detachStart: .94, detachEnd: 1.28,
  clearStart: 1.68, clearEnd: 1.82,
  halfSpan: 240, mobileAperture: .52, flowSpeed: 72,
} as const;

// Uneven small chips along a horizontal fracture, rather than a repeated zigzag.
export const FRACTURE_SEAM = Array.from({ length: 49 }, (_, i) => ({
  x: -100 + i * 25 + (i === 0 || i === 24 || i === 48 ? 0 : (seeded(i + 79) - .5) * 15),
  y: Math.sin(i * .63) * 9 + (seeded(i + 31) - .5) * (i % 3 === 0 ? 28 : 12),
}));
export const fractureOpeningWeight = (x: number) => .3 + .7 * Math.sin(Math.PI * clamp(x / 1000)) ** .6;
const centre = Math.floor(FRACTURE_SEAM.length / 2);
const length = (a: typeof FRACTURE_SEAM[number], b: typeof a) => Math.hypot(a.x - b.x, a.y - b.y);
const branchArrival = (node: number) => {
  const step = node < centre ? -1 : 1;
  let total = 0, travelled = 0;
  for (let i = centre; i + step >= 0 && i + step < FRACTURE_SEAM.length; i += step) {
    const segment = length(FRACTURE_SEAM[i], FRACTURE_SEAM[i + step]);
    total += segment;
    if (step < 0 ? i > node : i < node) travelled += segment;
  }
  return travelled / total;
};
export const FRACTURE_FACETS = [-1, 1].flatMap(side => FRACTURE_SEAM.slice(4, 44).flatMap((point, i) => {
  const seed = i + (side < 0 ? 751 : 941);
  if (seeded(seed) < .48) return [];
  const next = FRACTURE_SEAM[i + 5];
  const reach = 4 + seeded(seed + 121) ** 2 * 23;
  const peakX = point.x + (next.x - point.x) * (.12 + seeded(seed + 231) * .72);
  return [{ side, point, next, reach, peakX, weight: fractureOpeningWeight((point.x + next.x) / 2), beam: seeded(seed + 313) > .88 }];
}));
export const FRACTURE_BRANCHES = Array.from({ length: 15 }, (_, i) => {
  const node = 5 + Math.floor(seeded(i + 801) * 38);
  const origin = FRACTURE_SEAM[node];
  const side = seeded(i + 141) > .5 ? 1 : -1;
  const reach = 32 + seeded(i + 90) ** 2 * 112;
  const direction = origin.x < 500 ? -1 : 1;
  const lean = direction * (22 + seeded(i + 701) * 68);
  const points = [origin];
  for (let j = 1; j <= 5; j++) {
    const t = j / 5;
    points.push({ x: origin.x + lean * t + (seeded(i * 13 + j + 1101) - .5) * 10, y: origin.y + side * reach * t });
  }
  const path = (list: typeof points) => list.map((p, j) => `${j ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  // A branch cannot start before the main crack has actually reached its root.
  const delay = Math.min(.92, branchArrival(node) + .02);
  const branch = { delay, path: path(points), thin: false };
  if (seeded(i + 901) < .5) return [branch];
  const fork = points[3];
  return [branch, { delay: delay + (1 - delay) * .62, thin: true, path: path([fork, { x: fork.x + direction * 12, y: fork.y + side * 13 }, { x: fork.x + direction * 34, y: fork.y + side * 27 }]) }];
}).flat();
export const FRACTURE_SHARDS = Array.from({ length: 36 }, (_, i) => ({
  side: i % 2 ? 1 : -1,
  x: 90 + seeded(i + 221) * 820,
  size: 8 + seeded(i + 441) ** 2 * 38,
  detach: .06 + seeded(i + 341) * .58,
  reach: 150 + seeded(i + 451) * 390,
  drift: (seeded(i + 521) - .5) * 360,
  depth: 90 + seeded(i + 551) * 320,
  rotation: (seeded(i + 611) - .5) * 440,
  shape: i % 3,
}));

export function fractureContour(cover: number, aperture = 1) {
  const halfWidth = 3 + clamp(cover) * FRACTURE_MOTION.halfSpan * aperture;
  const top = FRACTURE_SEAM.map(point => ({ x: point.x, y: point.y - halfWidth * fractureOpeningWeight(point.x) }));
  const bottom = FRACTURE_SEAM.map(point => ({ x: point.x, y: point.y + halfWidth * fractureOpeningWeight(point.x) }));
  const path = (points: typeof top) => points.map((point, i) => `${i ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  return { top, bottom, topPath: path(top), bottomPath: path(bottom), voidPath: `${path(top)} ${path([...bottom].reverse()).replace(/^M/, "L")} Z`, halfWidth };
}

export function fractureFrame(position: number, elapsed: number, reduced = false) {
  const transition = openingTransition(position, reduced);
  const fade = 1 - smooth(FRACTURE_MOTION.clearStart, FRACTURE_MOTION.clearEnd, position);
  const crack = smooth(FRACTURE_MOTION.seedStart, FRACTURE_MOTION.seedEnd, position) * fade;
  return {
    ...transition,
    crack,
    burst: smooth(FRACTURE_MOTION.detachStart, FRACTURE_MOTION.detachEnd, position),
    energy: reduced ? 0 : (.78 + Math.sin(elapsed * 4.6) * .14 + Math.sin(elapsed * 7.1) * .06) * fade,
    flow: reduced ? 0 : (elapsed * FRACTURE_MOTION.flowSpeed) % 414,
    active: transition.active || crack > .001,
  };
}

/** Detached fragments keep their launch point instead of following the opening. */
export function fractureShard(index: number, burst: number, elapsed = 0, aperture = 1) {
  const shard = FRACTURE_SHARDS[index];
  const progress = clamp((burst - shard.detach) / (1 - shard.detach));
  const anchor = 3 + (.55 + shard.detach * .45) * FRACTURE_MOTION.halfSpan * aperture;
  return {
    x: shard.x + progress * shard.drift,
    y: 500 + shard.side * (anchor * fractureOpeningWeight(shard.x) + progress * shard.reach),
    z: progress * shard.depth,
    rotateX: progress * (index % 2 ? 210 : -180),
    rotateY: progress * shard.side * 260,
    rotateZ: progress * shard.rotation,
    float: Math.sin(elapsed * .8 + index) * progress * 3,
    opacity: smooth(0, .10, progress) * (1 - smooth(.68, 1, progress)),
  };
}
