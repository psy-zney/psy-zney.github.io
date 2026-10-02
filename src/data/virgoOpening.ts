// Opening coordinates deliberately do not depend on the interstellar layout.
// Small light sources reproduce the original constellation, rather than showing
// the surfaces of the much larger stars used during the flight.
import { clamp, smooth } from "./virgoFlight";

export const OPENING_HANDOFF = { start: .94, covered: 1.10, end: 1.24, release: 1.60, finish: 1.82 } as const;
export function openingPresentation(position: number) {
  // The original composition stays still. Change ownership behind an opaque
  // space fracture rather than shrinking/morphing two differently scaled scenes.
  return { opening: position < OPENING_HANDOFF.end, journey: position >= OPENING_HANDOFF.end };
}

export function openingTransition(position: number, reduced = false) {
  const closing = smooth(OPENING_HANDOFF.start, OPENING_HANDOFF.covered, position);
  const opening = smooth(OPENING_HANDOFF.release, OPENING_HANDOFF.finish, position);
  const cover = closing * (1 - opening);
  return { cover, lift: cover, flare: reduced ? 0 : Math.sin(cover * Math.PI), active: cover > .001 };
}

/** Fast wheel input must render the fully covered handoff at least once. */
export function protectOpeningHandoff(current: number, next: number) {
  if (current < OPENING_HANDOFF.covered && next > OPENING_HANDOFF.release) return OPENING_HANDOFF.end;
  if (current > OPENING_HANDOFF.release && next < OPENING_HANDOFF.covered) return OPENING_HANDOFF.end;
  return next;
}

/** Camera-local plane that cancels lens changes and off-axis station framing. */
export function openingScreenPlane(fov: number, mobile: boolean, projection: readonly number[]) {
  const depth = (mobile ? 48 : 25) * Math.tan((mobile ? 49 : 45) * Math.PI / 360) / Math.tan(fov * Math.PI / 360);
  return { x: projection[8] * depth / projection[0], y: projection[9] * depth / projection[5], z: -depth };
}

export const OPENING_STARS = [
  { position: [-5.2, -2.5, 0], color: "#acd6ff", main: true },
  { position: [-.6, .85, 0], color: "#f8e1ba", main: true },
  { position: [3.7, 3.1, 0], color: "#c4c6ff", main: true },
  { position: [6.35, -2.05, 0], color: "#ffd6c3", main: true },
  ...[
    [-8.65, 3.15], [-7.1, -4.8], [-4.3, -5.2], [-2.95, -1.2],
    [-1.55, 3.7], [1.4, 4.9], [5.4, 4.7], [8.2, 1.5], [8.65, -3.7], [2.95, -4.15],
  ].map(([x, y], i) => ({ position: [x, y, 0], color: ["#99b7e8", "#b3c8ed", "#93addc", "#c2d4ec", "#adc4ea", "#a8bee9", "#c2c5ed", "#b7c9ec", "#e4c8c0", "#bec8e7"][i], main: false })),
];
export const OPENING_EDGES = [[4, 8], [8, 1], [1, 7], [7, 0], [0, 5], [0, 6], [1, 9], [9, 2], [2, 10], [10, 11], [11, 3], [3, 12], [3, 13], [13, 7], [1, 2], [1, 3]] as const;

/** One wave spreads through every connection, branching when it reaches a star. */
export function createOpeningConnections(points: readonly (readonly number[])[], edges: readonly (readonly [number, number])[], root: number) {
  const lengths = edges.map(([a, b]) => Math.max(.0001, Math.hypot(...points[a].map((value, axis) => value - points[b][axis]))));
  const arrivals = points.map(() => Infinity);
  const visited = new Set<number>();
  arrivals[root] = 0;
  for (let step = 0; step < points.length; step++) {
    let next = -1;
    for (let i = 0; i < points.length; i++) {
      if (!visited.has(i) && (next < 0 || arrivals[i] < arrivals[next])) next = i;
    }
    if (next < 0 || !Number.isFinite(arrivals[next])) break;
    visited.add(next);
    edges.forEach(([a, b], i) => {
      const neighbor = a === next ? b : b === next ? a : -1;
      if (neighbor >= 0) arrivals[neighbor] = Math.min(arrivals[neighbor], arrivals[next] + lengths[i]);
    });
  }
  // On a loop, waves arriving from both ends meet before either repeats the edge.
  const duration = Math.max(...edges.map(([a, b], i) => (arrivals[a] + arrivals[b] + lengths[i]) / 2));
  return { arrivals, lengths, duration };
}

export const OPENING_CONNECTIONS = createOpeningConnections(OPENING_STARS.map(star => star.position), OPENING_EDGES, 4);
const openingWaveTime = (reveal: number) => clamp((reveal - .04) / .96) * OPENING_CONNECTIONS.duration;

export function openingStarAppearance(index: number, reveal: number) {
  const arrival = OPENING_CONNECTIONS.arrivals[index];
  return smooth(arrival - .3, arrival, openingWaveTime(reveal));
}

/** Fractions drawn from each end; completed edges are drawn only once. */
export function openingEdgeProgress(index: number, reveal: number): readonly [number, number] {
  const time = openingWaveTime(reveal);
  const [a, b] = OPENING_EDGES[index];
  const length = OPENING_CONNECTIONS.lengths[index];
  const leading = clamp((time - OPENING_CONNECTIONS.arrivals[a]) / length);
  const trailing = clamp((time - OPENING_CONNECTIONS.arrivals[b]) / length);
  return leading + trailing >= 1 - 1e-9 ? [1, 0] : [leading, trailing];
}
