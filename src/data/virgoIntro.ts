import { clamp, flightEase, smooth } from './virgoFlight';
import { OPENING_EDGES, OPENING_STARS, openingEdgeProgress, openingStarAppearance } from './virgoOpening';

export const INTRO_ASSEMBLY_DURATION = 4.9;
/** Restore the original branching wave, using the same stars and connections. */
export function introConstellationFrame(seconds: number) {
  const reveal = .04 + .96 * smooth(.35, INTRO_ASSEMBLY_DURATION, seconds);
  return { reveal, stars: OPENING_STARS.map((_, i) => openingStarAppearance(i, reveal)),
    edges: OPENING_EDGES.map((_, i) => openingEdgeProgress(i, reveal)) };
}
export const INTRO_CONSTELLATION_COMPLETE = introConstellationFrame(INTRO_ASSEMBLY_DURATION);

export const INTRO_DURATION = 7.8;
export const INTRO_ARRIVAL = 7.25;
export const INTRO_PALETTE = { sky: '#030308', gold: '#FFD166', violet: '#C7B8EA', rim: '#E0FBFC' } as const;
// One C2 curve owns the whole flight: no independently eased speed-up near arrival.
const cameraZ = (seconds: number) => 1000 - 4000 * flightEase((seconds - 2.75) / (INTRO_DURATION - 2.75));
export const INTRO_CAPTIONS = [
  { z: cameraZ(5.5), pass: 5.5, side: 1, vie: 'Xin chào, tôi là Lê Quang Khánh', eng: "Hello, I'm Lê Quang Khánh" },
  { z: cameraZ(6.9), pass: 6.9, side: -1, vie: 'Chào mừng đến với vũ trụ sáng tạo của tôi', eng: 'Welcome to my creative universe' },
] as const;

/** The camera keeps a fixed heading on the tunnel axis, including reverse travel. */
export function introFrame(seconds: number) {
  const t = clamp(seconds, 0, INTRO_DURATION);
  return { t, charge: 0, tear: smooth(0, 2.75, t), z: cameraZ(t), x: 0, y: 0,
    streak: 0, opacity: 1 - smooth(INTRO_ARRIVAL, INTRO_DURATION, t),
    phase: t < 2.75 ? 'opening' : t < 3.8 ? 'entering' : t < INTRO_ARRIVAL ? 'flying' : 'arriving' };
}

/** Follow the scroll destination, then stop; no automatic cruise velocity. */
export function advanceIntroScroll(seconds: number, velocity: number, target: number, delta: number) {
  const dt = clamp(delta, 0, .05), distance = target - seconds;
  const desired = clamp(distance * 10, -2, 2);
  const nextVelocity = velocity + clamp(desired - velocity, -6 * dt, 6 * dt);
  const step = (velocity + nextVelocity) * .5 * dt;
  if (Math.abs(distance) < .0001 || Math.sign(step) === Math.sign(distance) && Math.abs(step) >= Math.abs(distance)) return { seconds: target, velocity: 0 };
  return { seconds: clamp(seconds + step, 0, INTRO_DURATION), velocity: nextVelocity };
}

export type IntroFrame = ReturnType<typeof introFrame>;

/** Grid, wall dust and lettering share this exact cylinder and projection. */
export function introTunnelView(width: number, height: number) {
  return { width, height, focal: height * .88, radius: Math.min(width < 900 ? 420 : 520, width / height * 650) };
}
export type IntroTunnelView = ReturnType<typeof introTunnelView>;
export function projectTunnelWall(view: IntroTunnelView, frame: IntroFrame, theta: number, z: number, inset = 1) {
  const depth = frame.z - z;
  const bend = smooth(0, 7200, 1200 - z);
  const angle = theta + .42 * Math.sin(z / 1800);
  const scale = view.focal / Math.max(1, depth);
  return { x: view.width / 2 + view.radius * (Math.cos(angle) * inset + .48 * bend) * scale,
    y: view.height / 2 + view.radius * (Math.sin(angle) * inset + .18 * bend) * scale, depth };
}

/** A helical patch on the inside wall: u follows depth, v follows circumference. */
export function introCaptionPoint(view: IntroTunnelView, frame: IntroFrame, index: number, u: number, v: number) {
  const caption = INTRO_CAPTIONS[index];
  // One horizontal line follows a fixed circumferential band, on every viewport.
  const theta = -caption.side * Math.PI / 2 + caption.side * (u - .5) * 1.5;
  return projectTunnelWall(view, frame, theta, caption.z - (v - .5) * caption.side * 220, .98);
}
