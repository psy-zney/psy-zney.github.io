import { TRANSIT_LEGS, transitSample } from "./virgoTransit";
import { ORBIT_PLANE, orbitRadii } from "./virgoSpace";
import { celestialSlot } from './celestialRegistry';

/** Scroll is measured in chapters, matching each real scroll step's offset. */
export const FLIGHT_MOTION = {
  scrollLerp: .075,
  wheelMultiplier: 1.25,
  openingDuration: 8.4,
  cameraDamping: 8,
  settleThreshold: .00005,
  exitDuration: 1.85,

} as const;

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function smooth(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}
/** Zero velocity and acceleration at either end of a flight. */
export function flightEase(value: number) {
  const t = clamp(value);
  return clamp(t * t * t * (t * (t * 6 - 15) + 10));
}
export function navigationDuration(chapters: number) {
  return 2.2 + clamp(Math.abs(chapters), 0, 48) * .75;
}
export function flightPositionForScroll(top: number, offsets: readonly number[]) {
  if (offsets.length < 2) return 0;
  const last = offsets.length - 1;
  for (let i = last - 1; i >= 0; i--) {
    if (top >= offsets[i]) return clamp(i + (top - offsets[i]) / Math.max(1, offsets[i + 1] - offsets[i]), 0, last);
  }
  return 0;
}
export function scrollOffsetForPosition(position: number, offsets: readonly number[]) {
  if (offsets.length < 2) return 0;
  const p = clamp(position, 0, offsets.length - 1);
  const leg = Math.min(offsets.length - 2, Math.floor(p));
  return offsets[leg] + (offsets[leg + 1] - offsets[leg]) * (p - leg);
}
/** Frame-rate independent camera follow; cap long idle/background frames. */
export function advanceFlightPosition(current: number, target: number, delta: number) {
  if (Math.abs(target - current) < FLIGHT_MOTION.settleThreshold) return target;
  return current + (target - current) * (1 - Math.exp(-FLIGHT_MOTION.cameraDamping * clamp(delta, 0, .05)));
}
export function flightSample(position: number, reduced = false, elapsed = 0) {
  const p = clamp(position, 0, 6);
  const leg = Math.min(5, Math.floor(p));
  const local = p - leg;
  // Follow the first wheel increment, even on the expanded interstellar track.
  // Lenis and camera damping smooth input; long stationary departure/arrival
  // ranges and a second full ease made ordinary wheel input feel unresponsive.
  const travel = reduced ? (local < .64 ? 0 : 1) : local;
  return {
    position: p,
    leg,
    travel,
    chapter: p < .82 ? 0 : Math.min(6, Math.floor(p + .36)),
    // Restore the original timed constellation assembly. Scrolling can reveal
    // it sooner, while camera travel remains controlled by the scroll position.
    reveal: reduced ? 1 : .04 + .96 * Math.max(smooth(0, .70, p), smooth(0, FLIGHT_MOTION.openingDuration, elapsed)),
    origin: smooth(1.30, 1.90, p) * (1 - smooth(2.15, 2.72, p)),
    projects: smooth(2.30, 2.86, p) * (1 - smooth(4.14, 4.72, p)),
    outer: smooth(3.12, 3.74, p),
    skills: smooth(4.30, 4.86, p) * (1 - smooth(5.30, 5.86, p)),
    assembly: reduced ? 1 : smooth(5.10, 5.72, p),
    contact: smooth(5.42, 5.96, p),
    thrust: reduced ? 0 : transitSample(p).cruise,
  };
}
export type FlightSample = ReturnType<typeof flightSample>;

/** The journey keeps one lens, including the classroom approach. */
export function flightFieldOfView(_position: number, mobile = false, _reduced = false, _exit = 0) {
  return mobile ? 49 : 46;
}

export function panelVisibility(index: number, position: number, reduced = false) {
  if (reduced) return flightSample(position, true).chapter === index ? 1 : 0;
  if (index >= 2) {
    const arrival = index === 2 ? [1.92, 1.98] : index === 3 ? [2.94, 2.99] : index === 4 ? [3.54, 3.94] : index === 5 ? [4.80, 4.96] : [5.82, 5.98];
    const departure = index === 2 ? [2.16, 2.32] : index === 3 ? [3.12, 3.54] : index === 4 ? [4.09, 4.25] : [5.14, 5.30];
    return smooth(arrival[0], arrival[1], position) * (index === 6 ? 1 : 1 - smooth(departure[0], departure[1], position));
  }
  if (index === 0) return 1 - smooth(.56, .98, position);
  const incoming = index === 1 ? smooth(.56, .98, position) : smooth(index - .46, index - .06, position);
  const outgoing = index === 6 ? 1 : 1 - smooth(index + .12, index + .54, position);
  return incoming * outgoing;
}

/** Reading a station isolates that system; the opening owns the Virgo silhouette. */
export function focusedStarForPosition(position: number, reduced = false) {
  if (!reduced && TRANSIT_LEGS.some(leg => position > leg.from && position < leg.to)) return null;
  const focus = [panelVisibility(2, position, reduced), Math.max(panelVisibility(3, position, reduced), panelVisibility(4, position, reduced)), panelVisibility(5, position, reduced), panelVisibility(6, position, reduced)];
  const strongest = Math.max(...focus);
  return strongest > .02 ? focus.indexOf(strongest) : null;
}

/** One shared orbit calculation keeps planets, beams and DOM labels aligned. */
export function orbitPosition(index: number, count: number, position: number, skills = false, _assembly = 1, elapsed = 0, mobile = false) {
  const slot = celestialSlot(index, count, skills);
  const ring = slot.orbit;
  const radius = orbitRadii(skills, mobile)[ring];
  const angle = -Math.PI / 2 + ring * .3 + slot.slot / slot.slots * Math.PI * 2 + elapsed * Math.PI * 2 / [100, 150, 220][ring];
  // Ambient time owns phase; scroll owns appearance. Every consumer uses
  // the same circular inclined orbit, including skill evidence connectors.
  return [Math.cos(angle) * radius, Math.sin(angle) * radius * ORBIT_PLANE.vertical, Math.sin(angle) * radius * ORBIT_PLANE.depth];
}
