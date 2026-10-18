import { clamp, FLIGHT_MOTION, smooth } from "./virgoFlight";
import { narrativeEdges, NARRATIVE_BEATS } from "./virgoNarrative";
import { TRANSIT_LEGS } from "./virgoTransit";
import { OPENING_HANDOFF } from "./virgoOpening";
import { motionTokens } from './motionTokens';

export const STORY_PACING = {
  travelRate: .42,
  openSeconds: motionTokens.storyOpen / 1000,
  closeSeconds: motionTokens.storyClose / 1000,
  readSeconds: 1.30,
  handoffSeconds: .70,
  transitSeconds: 3.4,
  finalTransitSeconds: 1.8,
  approachSeconds: 1.9,
  wheelStepVh: .22,
  wheelLeadVh: .32,
} as const;

export const HOME_PACING = {
  travelRate: .62,
  openSeconds: motionTokens.homeOpen / 1000,
  closeSeconds: motionTokens.homeClose / 1000,
  readSeconds: .75,
} as const;
export const narrativePacing = (index: number) => NARRATIVE_BEATS[index].side === "middle" ? HOME_PACING : STORY_PACING;

const limits = NARRATIVE_BEATS.flatMap((beat, i) => {
  const { open, close } = narrativeEdges(i);
  const pace = narrativePacing(i);
  return [
    { from: beat.from, to: open, rate: (open - beat.from) / pace.openSeconds },
    { from: open, to: close, rate: (close - open) / pace.readSeconds },
    { from: close, to: beat.to, rate: (beat.to - close) / pace.closeSeconds },
  ];
});
limits.push({ from: OPENING_HANDOFF.start, to: OPENING_HANDOFF.covered,
  rate: (OPENING_HANDOFF.covered - OPENING_HANDOFF.start) / STORY_PACING.handoffSeconds });
limits.push({ from: OPENING_HANDOFF.release, to: OPENING_HANDOFF.finish,
  rate: (OPENING_HANDOFF.finish - OPENING_HANDOFF.release) / STORY_PACING.handoffSeconds });

for (const leg of TRANSIT_LEGS) limits.push({ from: leg.from, to: leg.to, rate: (leg.to - leg.from) / (leg.origin < 0 ? STORY_PACING.approachSeconds : leg.destination === 3 ? STORY_PACING.finalTransitSeconds : STORY_PACING.transitSeconds) });

// Ease into every speed limit before its boundary. Piecewise constant rates
// made the same wheel gesture lurch when a reading interval became a flight.
const positions = [...new Set([...Array.from({ length: 6001 }, (_, i) => i / 1000),
  ...limits.flatMap(limit => [clamp(limit.from, 0, 6), clamp(limit.to, 0, 6)])])].sort((a, b) => a - b);
const resolution = positions.length - 1, times = new Float64Array(positions.length);
function rateAt(position: number) {
  const home = smooth(NARRATIVE_BEATS[0].from - .025, NARRATIVE_BEATS[0].from, position) * (1 - smooth(1.78, 1.86, position));
  const base = STORY_PACING.travelRate + (HOME_PACING.travelRate - STORY_PACING.travelRate) * home;
  let rate: number = base;
  for (const limit of limits) {
    const influence = smooth(limit.from - .025, limit.from, position) * (1 - smooth(limit.to, limit.to + .025, position));
    rate = Math.min(rate, base + (Math.min(base, limit.rate) - base) * influence);
  }
  return rate;
}
let inverseRate = 1 / rateAt(0);
for (let i = 1; i <= resolution; i++) {
  const nextInverse = 1 / rateAt(positions[i]);
  times[i] = times[i - 1] + (positions[i] - positions[i - 1]) * (inverseRate + nextInverse) / 2;
  inverseRate = nextInverse;
}

/** One reversible travel-time map, with no locks, timers or replayed entrances. */
export function storyTimeAt(position: number) {
  const p = clamp(position, 0, 6);
  let low = 0, high = resolution;
  while (high - low > 1) {
    const mid = (low + high) >>> 1;
    if (positions[mid] <= p) low = mid; else high = mid;
  }
  return times[low] + (times[high] - times[low]) * (p - positions[low]) / (positions[high] - positions[low]);
}
export function storyPositionAt(time: number) {
  const t = clamp(time, 0, times[resolution]);
  let low = 0, high = resolution;
  while (high - low > 1) {
    const mid = (low + high) >>> 1;
    if (times[mid] <= t) low = mid; else high = mid;
  }
  return positions[low] + (positions[high] - positions[low]) * (t - times[low]) / (times[high] - times[low]);
}
export function advancePacedFlightPosition(current: number, target: number, delta: number) {
  if (Math.abs(target - current) < FLIGHT_MOTION.settleThreshold) return target;
  const start = storyTimeAt(current), distance = storyTimeAt(target) - start;
  const dt = clamp(delta, 0, .045);
  const travel = Math.min(dt, Math.abs(distance) * -Math.expm1(-FLIGHT_MOTION.cameraDamping * dt));
  return storyPositionAt(start + Math.sign(distance) * travel);
}

/** Bound burst input to a small lead; ordinary wheel speed remains unchanged. */
export function storyWheelDelta(delta: number, target: number, rendered: number, height: number) {
  const direction = Math.sign(delta);
  const remaining = Math.max(0, height * STORY_PACING.wheelLeadVh - direction * (target - rendered));
  return direction * Math.min(Math.abs(delta), height * STORY_PACING.wheelStepVh, remaining);
}

/** Wheel magnitude drives distance; reversing discards the pending forward lead. */
export function storyWheelTarget(delta: number, target: number, rendered: number, height: number, minimum: number, maximum: number) {
  const origin = Math.sign(delta) !== Math.sign(target - rendered) ? rendered : target;
  return clamp(origin + storyWheelDelta(delta, origin, rendered, height), minimum, maximum);
}
