import { SPACE_LAYOUT } from "./virgoSpace";
import { VIRGO_STARS } from "./virgoStations";

const unit = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = unit(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const ramp = (from: number, to: number, p: number) => ease((p - from) / (to - from));

// A flight has its own interval between the last outgoing and first incoming sentence.
export const TRANSIT_LEGS = [
  { from: 1.82, to: 1.92, origin: -1, destination: 0 },
  { from: 2.32, to: 2.94, origin: 0, destination: 1 },
  { from: 4.25, to: 4.80, origin: 1, destination: 2 },
  { from: 5.30, to: 5.82, origin: 2, destination: 3 },
] as const;

export function transitSample(position: number) {
  const index = TRANSIT_LEGS.findIndex(leg => position >= leg.from && position <= leg.to);
  if (index < 0) return { index: -1, progress: 0, envelope: 0, cruise: 0 };
  const leg = TRANSIT_LEGS[index];
  const progress = unit((position - leg.from) / (leg.to - leg.from));
  return { index, progress, envelope: ramp(0, .16, progress) * (1 - ramp(.84, 1, progress)),
    cruise: Math.sin(Math.PI * progress) ** 2 };
}

export function systemPresence(index: number, position: number) {
  if (index < 0 || index >= VIRGO_STARS.length) return 0;
  const arrival = TRANSIT_LEGS.find(leg => leg.destination === index);
  const departure = TRANSIT_LEGS.find(leg => leg.origin === index);
  const incoming = arrival ? ramp(arrival.to - Math.min(.15, (arrival.to - arrival.from) * .30), arrival.to, position) : 1;
  const outgoing = departure ? 1 - ramp(departure.from, departure.from + .12, position) : 1;
  return incoming * outgoing;
}

/** One monotone world-space axis; the lens and heading do not animate. */
export function journeyCameraZ(position: number, mobile = false) {
  const distance = mobile ? SPACE_LAYOUT.mobileCamera.distance : SPACE_LAYOUT.desktopCamera.distance;
  const anchors = [
    { p: 0, z: 650 }, { p: 1, z: 500 },
    { p: 1.82, z: distance + 300 }, { p: 1.92, z: distance },
    { p: 2.32, z: distance - 10 }, { p: 2.94, z: VIRGO_STARS[1].position[2] + distance },
    { p: 4.25, z: VIRGO_STARS[1].position[2] + distance - 20 },
    { p: 4.80, z: VIRGO_STARS[2].position[2] + distance },
    { p: 5.30, z: VIRGO_STARS[2].position[2] + distance - 10 },
    { p: 5.82, z: VIRGO_STARS[3].position[2] + distance },
    { p: 6, z: VIRGO_STARS[3].position[2] + distance - 3 },
  ];
  const p = Math.max(0, Math.min(6, position));
  const i = anchors.findIndex((_, index) => index < anchors.length - 1 && p <= anchors[index + 1].p);
  const a = anchors[i], b = anchors[i + 1];
  return a.z + (b.z - a.z) * ramp(a.p, b.p, p);
}

/** Fixed objects create true perspective parallax as the camera passes them. */
export function transitPlanets(index: number, mobile = false) {
  const leg = TRANSIT_LEGS[index];
  const from = journeyCameraZ(leg.from, mobile), to = journeyCameraZ(leg.to, mobile);
  const fractions = [.12, .27, .44, .60, .76, .88];
  return fractions.slice(0, mobile ? 4 : 6).map((fraction, i) => ({
    index: (i + index * 3) % 10,
    radius: [6.5, 9, 4.8, 7.4, 5.6, 8][i] * (mobile ? .65 : 1),
    position: [((i % 2 ? -1 : 1) * [30, 27, 36, 24, 34, 29][i]) * (mobile ? .50 : 1),
      [10, -8, 14, -12, 9, -13][i] * (mobile ? .65 : 1), from + (to - from) * fraction] as [number, number, number],
  }));
}
