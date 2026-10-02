import { advanceFlightPosition, clamp } from "./virgoFlight";
import { narrativeEdges, NARRATIVE_BEATS } from "./virgoNarrative";
import { TRANSIT_LEGS } from "./virgoTransit";
import { OPENING_HANDOFF } from "./virgoOpening";

export const STORY_PACING = {
  travelRate: .42,
  openSeconds: .50,
  closeSeconds: .36,
  readSeconds: 1.30,
  handoffSeconds: .70,
  transitSeconds: 3.4,
  approachSeconds: 1.9,
  wheelStepVh: .32,
  wheelLeadVh: .80,
} as const;

export const HOME_PACING = {
  travelRate: .62,
  openSeconds: .40,
  closeSeconds: .28,
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

for (const leg of TRANSIT_LEGS) limits.push({ from: leg.from, to: leg.to, rate: (leg.to - leg.from) / (leg.origin < 0 ? STORY_PACING.approachSeconds : STORY_PACING.transitSeconds) });

const boundaries = [...new Set([0, 6, ...limits.flatMap(l => [clamp(l.from, 0, 6), clamp(l.to, 0, 6)])])].sort((a, b) => a - b);
let seconds = 0;
const timeline = boundaries.slice(0, -1).map((from, i) => {
  const to = boundaries[i + 1], center = (from + to) / 2;
  const baseRate = center >= NARRATIVE_BEATS[0].from && center < 1.82 ? HOME_PACING.travelRate : STORY_PACING.travelRate;
  const rate = Math.min(baseRate, ...limits.filter(l => center >= l.from && center < l.to).map(l => l.rate));
  const start = seconds;
  seconds += (to - from) / rate;
  return { from, to, rate, start, end: seconds };
});

/** One reversible travel-time map, with no locks, timers or replayed entrances. */
export function storyTimeAt(position: number) {
  const p = clamp(position, 0, 6);
  const segment = timeline.find(s => p <= s.to)!;
  return segment.start + (p - segment.from) / segment.rate;
}
export function storyPositionAt(time: number) {
  const t = clamp(time, 0, seconds);
  const segment = timeline.find(s => t <= s.end)!;
  return segment.from + (t - segment.start) * segment.rate;
}
export function advancePacedFlightPosition(current: number, target: number, delta: number) {
  const next = advanceFlightPosition(current, target, delta);
  const start = storyTimeAt(current), end = storyTimeAt(next);
  const step = clamp(end - start, -clamp(delta, 0, .05), clamp(delta, 0, .05));
  return Math.abs(end - start) <= Math.abs(step) ? next : storyPositionAt(start + step);
}

/** Bound burst input to a small lead; ordinary wheel speed remains unchanged. */
export function storyWheelDelta(delta: number, target: number, rendered: number, height: number) {
  const direction = Math.sign(delta);
  const remaining = Math.max(0, height * STORY_PACING.wheelLeadVh - direction * (target - rendered));
  return direction * Math.min(Math.abs(delta), height * STORY_PACING.wheelStepVh, remaining);
}
