import { clamp, smooth } from './virgoFlight';

export type ShowcaseMotionMode = 'target' | 'inertia';

const READING_WINDOWS = [[1.92, 2.32], [2.94, 4.25], [4.80, 5.30]] as const;

/** Orbit the local view while the interstellar flight keeps its forward axis.
 * The outgoing system retains its final angle; it never unwinds during transit.
 */
export function readingOrbitAngle(index: number, position: number, reduced = false) {
  const window = READING_WINDOWS[index];
  if (!window || reduced) return 0;
  const t = clamp((position - window[0]) / (window[1] - window[0]));
  return Math.PI * smooth(0, 1, t);
}

/** Inverse view rotation about the star, shared by meshes and projected labels. */
export function readingOrbitPoint(point: readonly number[], index: number, position: number, reduced = false) {
  const angle = readingOrbitAngle(index, position, reduced), c = Math.cos(angle), s = Math.sin(angle);
  return [point[0] * c - point[2] * s, point[1], point[0] * s + point[2] * c] as const;
}

/** A reversible light passage separates the web screens from installed apps. */
export function showcaseChapterTransition(position: number, reduced = false) {
  if (reduced || position <= 5.12 || position >= 5.88) return 0;
  return Math.sin(Math.PI * smooth(5.12, 5.88, position));
}

/** Integrate momentum without snapping; explicit navigation keeps its destination. */
export function advanceShowcaseMotion(x: number, target: number, velocity: number, delta: number, min: number, max: number, mode: ShowcaseMotionMode, reduced = false) {
  const dt = clamp(delta, 0, .04);
  target = clamp(target, min, max);
  if (reduced) return { x: target, target, velocity: 0, settled: true };
  if (mode === 'inertia') {
    const decay = Math.exp(-7 * dt);
    const next = x + velocity * (1 - decay) / 7;
    x = clamp(next, min, max);
    velocity = next !== x ? 0 : velocity * decay;
    const settled = Math.abs(velocity) < 2;
    return { x, target: x, velocity: settled ? 0 : velocity, settled };
  }
  const omega = 10;
  const offset = x - target;
  const impulse = velocity + omega * offset;
  const decay = Math.exp(-omega * dt);
  x = clamp(target + (offset + impulse * dt) * decay, min, max);
  velocity = (velocity - omega * impulse * dt) * decay;
  const settled = Math.abs(x - target) < .15 && Math.abs(velocity) < 2;
  return { x: settled ? target : x, target, velocity: settled ? 0 : velocity, settled };
}

/** Neighboring screens share a cylinder: scrolling changes its angle continuously. */
export function screenOrbit(index: number, position: number, width: number, reduced = false) {
  const distance = index - position;
  const angle = distance * .64;
  const radius = width / (2 * Math.sin(.32)) * .94;
  return {
    x: reduced ? distance * width * 1.08 : Math.sin(angle) * radius,
    z: reduced ? 0 : (1 - Math.cos(angle)) * radius,
    yaw: reduced ? 0 : -angle * 180 / Math.PI,
    visible: Math.abs(distance) < (reduced ? 1.5 : 1.75),
    brightness: Math.max(.32, 1 - Math.abs(distance) * .32),
  };
}

export function journeySoundEnvelope(speed: number, position: number, muted: boolean, exit = 0) {
  if (muted) return { air: 0, tone: 0, frequency: 260 };
  const motion = clamp(Math.abs(speed) * .55);
  return {
    air: motion * .035,
    tone: motion * .012 + smooth(5.72, 6, position) * .008 + smooth(0, .7, exit) * .022,
    frequency: 260 + motion * 1100 + exit * 600,
  };
}



/** Project fixed stars from a rotating viewpoint at the centre of the sky. */
export function showcaseSkyStar(index: number, position: number) {
  const azimuth = index * 2.399963229728653 - position * .64;
  const elevation = Math.asin((((index * 73 + 29) % 211) / 211) * 1.7 - .85);
  const depth = Math.cos(azimuth);
  return { x: 800 + Math.sin(azimuth) / Math.max(.12, depth) * 850,
    y: 500 - Math.tan(elevation) / Math.max(.12, depth) * 850,
    visible: depth > .18 };
}

export function showcaseArrival(position: number, reduced = false) {
  const progress = smooth(2.32, 2.92, position);
  return { opacity: reduced ? 0 : smooth(2.32, 2.58, position) * (1 - smooth(2.88, 3.04, position)), scale: .35 + progress * 1.8 };
}
