import { clamp, smooth } from './virgoFlight';

export type ShowcaseMotionMode = 'target' | 'inertia';

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

const READING_ORBITS = [[1.92, 2.32, 2.22, 2.32], [2.94, 4.25, 3.23, 3.95], [4.80, 5.30, 4.92, 5.17]];

/** A reversible orbit driven by the rendered scroll position, without idle drift. */
export function spatialGaze(position: number, reduced = false) {
  if (reduced) return { yaw: 0, pitch: 0, roll: 0, station: -1 };
  const station = READING_ORBITS.findIndex(([from, to]) => position >= from && position <= to);
  const window = READING_ORBITS[station];
  if (!window) return { yaw: Math.sin(position * Math.PI) * .12 * (1 - smooth(1.50, 1.82, position)), pitch: 0, roll: 0, station: -1 };
  const [, , from, to] = window;
  const yaw = Math.PI * smooth(from, to, position);
  return { yaw, pitch: 0, roll: 0, station };
}

/** A true semicircle, followed by a continuous flight to the next station.
 * Radius and heading share the same angle; reversing scroll retraces the path.
 * Contact keeps its front view so the black-hole billboard remains undistorted.
 */
export function narrativeOrbitPose(position: number, radius: number, spacing: number, reduced = false) {
  if (reduced || position < 1.92 || position > 5.82) return null;
  const windows = [[1.92, 2.32], [2.94, 4.25], [4.80, 5.30], [5.82, 5.82]];
  for (let station = 0; station < 3; station++) {
    const [, to] = windows[station];
    if (position <= to) {
      const angle = Math.PI * smooth(READING_ORBITS[station][2], READING_ORBITS[station][3], position);
      return { x: Math.sin(angle) * radius, z: -station * spacing + Math.cos(angle) * radius, angle };
    }
    const next = windows[station + 1][0];
    if (position < next) {
      // Finish the reading orbit, turn in place, then travel straight ahead.
      // Translating while still looking back made the departure feel reversed.
      const progress = (position - to) / (next - to);
      const turn = smooth(0, .18, progress);
      const t = smooth(.18, 1, progress);
      return { x: 0,
        z: (-station * spacing - radius) * (1 - t) + (-(station + 1) * spacing + radius) * t,
        angle: Math.PI * (1 - turn) };
    }
  }
  return { x: 0, z: -3 * spacing + radius, angle: 0 };
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
