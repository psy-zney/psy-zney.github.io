import { clamp, smooth } from './virgoFlight';
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
export const INTRO_ARRIVAL = 3.2;
export const INTRO_ENTRANCE_Z = 500;
export const INTRO_EXIT_Z = -4400;
export const INTRO_EXIT_REVEAL_DEPTH = 650;
export const INTRO_TUNNEL_GRID = { rings: 18, rails: 20, spacing: 550, visible: false } as const;
export const INTRO_PALETTE = { sky: '#030308', gold: '#FFD166', violet: '#C7B8EA', rim: '#E0FBFC' } as const;
// Ease into translation, then keep travelling through the exit instead of stopping to fade.
const cameraZ = (position: number) => {
  const t = clamp((position - 2.75) / (INTRO_DURATION - 2.75));
  const distance = (t - .05 * (1 - Math.exp(-t / .05))) / (1 - .05 * (1 - Math.exp(-20)));
  return 1000 - 5401 * distance;
};
export const INTRO_CAPTIONS = [
  { z: cameraZ(5.5), pass: 5.5, side: 1, vie: 'Xin chào, tôi là Lê Quang Khánh', eng: "Hello, I'm Lê Quang Khánh" },
  { z: cameraZ(6.9), pass: 6.9, side: -1, vie: 'Chào mừng đến với vũ trụ sáng tạo của tôi', eng: 'Welcome to my creative universe' },
] as const;

/** The camera keeps a fixed heading on the tunnel axis, including reverse travel. */
export function introFrame(seconds: number) {
  const t = clamp(seconds, 0, INTRO_DURATION);
  const exitDepth = cameraZ(t) - INTRO_EXIT_Z;
  return { t, charge: 0, tear: smooth(0, 2.75, t), z: cameraZ(t), x: 0, y: 0,
    streak: 0, opacity: 1, exitDepth, exitReveal: smooth(INTRO_EXIT_REVEAL_DEPTH, 0, exitDepth),
    phase: t < 2.75 ? 'opening' : cameraZ(t) > INTRO_ENTRANCE_Z ? 'entering' : cameraZ(t) - INTRO_EXIT_Z > 1000 ? 'flying' : 'exiting' };
}

/** Follow the scroll destination, then stop; no automatic cruise velocity. */
export function advanceIntroScroll(seconds: number, velocity: number, target: number, delta: number) {
  const dt = clamp(delta, 0, .05), distance = target - seconds;
  // Reversal cancels residual forward momentum on the very first frame.
  if (Math.sign(velocity) !== Math.sign(distance)) velocity = 0;
  const desired = clamp(distance * 10, -2, 2);
  const nextVelocity = velocity + clamp(desired - velocity, -6 * dt, 6 * dt);
  const step = (velocity + nextVelocity) * .5 * dt;
  if (Math.abs(distance) < .0001 || Math.sign(step) === Math.sign(distance) && Math.abs(step) >= Math.abs(distance)) return { seconds: target, velocity: 0 };
  return { seconds: clamp(seconds + step, 0, INTRO_DURATION), velocity: nextVelocity };
}

export type IntroFrame = ReturnType<typeof introFrame>;

/** Grid, wall dust and lettering share this exact cylinder and projection. */
export function introTunnelView(width: number, height: number) {
  return { width, height, focal: height * .88, radius: Math.min(width < 900 ? 420 : 520, width / height * (width < 600 ? 300 : 650)) };
}
export type IntroTunnelView = ReturnType<typeof introTunnelView>;
export const introWallTwist = (z: number) => .42 * Math.sin(z / 1800);
export function projectTunnelWall(view: IntroTunnelView, frame: IntroFrame, theta: number, z: number, inset = 1) {
  const depth = frame.z - z;
  const bend = smooth(0, 7200, 1200 - z);
  const angle = theta + introWallTwist(z);
  const scale = view.focal / Math.max(1, depth);
  return { x: view.width / 2 + view.radius * (Math.cos(angle) * inset + .48 * bend) * scale,
    y: view.height / 2 + view.radius * (Math.sin(angle) * inset + .18 * bend) * scale, depth };
}

/** Letter baseline follows the flight axis; only the light trails follow the helix. */
export function introCaptionPoint(view: IntroTunnelView, frame: IntroFrame, index: number, u: number, v: number) {
  const caption = INTRO_CAPTIONS[index];
  const z = caption.z + (u - .5) * caption.side * (view.width < 600 ? 900 : 1500);
  const angle = (caption.side > 0 ? -.14 : Math.PI + .14) + (v - .5) * caption.side * .26;
  return projectTunnelWall(view, frame, angle - introWallTwist(z), z, .98);
}

/** Differential rotation: inner gas turns faster than the outer rim. */
export const introVortexAngle = (radius: number, time: number) => time * (.16 + .42 / Math.max(.25, radius) ** 1.5);

/** Screen-space gravitational shear, shared by background stars and sampled connections. */
export function introWarpPoint(x: number, y: number, core: { x: number; y: number }, reach: number, opening: number, time: number) {
  const dx = x - core.x, dy = y - core.y, radius = Math.hypot(dx, dy);
  const influence = opening * Math.exp(-radius * radius / Math.max(1, reach * reach));
  const angle = Math.atan2(dy, dx) + influence * (.8 + opening * 1.8 + Math.sin(time * .5) * .35);
  const r = radius * (1 - influence * .07);
  return { x: core.x + Math.cos(angle) * r, y: core.y + Math.sin(angle) * r };
}
