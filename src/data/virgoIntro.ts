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
  { z: cameraZ(5.5), pass: 5.5, side: -1, effect: 'ion-scan', vie: 'Xin chào, tôi là Lê Quang Khánh', eng: "Hello, I'm Lê Quang Khánh" },
  { z: cameraZ(6.9), pass: 6.9, side: 1, effect: 'wave-light', vie: 'Chào mừng đến với vũ trụ sáng tạo của tôi', eng: 'Welcome to my creative universe' },
] as const;

/** The camera keeps a fixed heading on the tunnel axis, including reverse travel. */
export function introFrame(seconds: number) {
  const t = clamp(seconds, 0, INTRO_DURATION);
  const exitDepth = cameraZ(t) - INTRO_EXIT_Z;
  return { t, charge: 0, tear: smooth(0, 2.75, t), z: cameraZ(t), x: 0, y: 0,
    streak: 0, opacity: 1, exitDepth, exitReveal: smooth(INTRO_EXIT_REVEAL_DEPTH, 0, exitDepth),
    phase: t < 2.75 ? 'opening' : cameraZ(t) > INTRO_ENTRANCE_Z ? 'entering' : cameraZ(t) - INTRO_EXIT_Z > 1000 ? 'flying' : 'exiting' };
}

/** Fine opening/entry control blends continuously into the existing tunnel pace. */
export function introScrollResponse(_seconds: number) {
  return { gain: .95, step: .55,
    lead: .85, speed: 1.9, acceleration: 7.2 };
}

export function introInputTarget(seconds: number, target: number, amount: number) {
  const response = introScrollResponse(seconds);
  const origin = Math.sign(amount) !== Math.sign(target - seconds) ? seconds : target;
  return clamp(origin + clamp(amount * response.gain, -response.step, response.step),
    Math.max(0, seconds - response.lead), Math.min(INTRO_DURATION, seconds + response.lead));
}

/** Follow the scroll destination, then stop; no automatic cruise velocity. */
export function advanceIntroScroll(seconds: number, velocity: number, target: number, delta: number) {
  const dt = clamp(delta, 0, .05), distance = target - seconds;
  // Reversal cancels residual forward momentum on the very first frame.
  if (Math.sign(velocity) !== Math.sign(distance)) velocity = 0;
  const response = introScrollResponse(seconds);
  const desired = clamp(distance * 10, -response.speed, response.speed);
  const nextVelocity = velocity + clamp(desired - velocity, -response.acceleration * dt, response.acceleration * dt);
  const step = (velocity + nextVelocity) * .5 * dt;
  if (Math.abs(distance) < .0001 || Math.sign(step) === Math.sign(distance) && Math.abs(step) >= Math.abs(distance)) return { seconds: target, velocity: 0 };
  return { seconds: clamp(seconds + step, 0, INTRO_DURATION), velocity: nextVelocity };
}

export type IntroFrame = ReturnType<typeof introFrame>;

/** One shot reaches the core before the aperture opens; reverse restores its path. */
export function introPortalShot(seconds: number) {
  const t = clamp(seconds, 0, 2.75), head = smooth(.03, .42, t);
  return { head, tail: Math.max(0, head - .28),
    opacity: smooth(0, .06, t) * (1 - smooth(.42, .56, t)),
    impact: smooth(.36, .42, t) * (1 - smooth(.42, .78, t)) };
}

/** Project one narrow Z-directed beam beside the lens axis so its shaft is visible. */
export function introPortalShotProjection(width: number, height: number, core: { x: number; y: number }, seconds: number) {
  const shot = introPortalShot(seconds), unit = Math.min(width, height);
  const lensOffset = Math.min(width * .24, unit * .35);
  // Accelerate into depth so the shaft remains readable before reaching the star's corona.
  const projectX = (depth: number) => core.x + lensOffset * (1 / (1 + depth * depth * 14) - 1 / 15);
  return { x: core.x, y: core.y, headX: projectX(shot.head), headY: core.y,
    tailX: projectX(shot.tail), tailY: core.y, headRadius: 1.2, tailRadius: 2.4,
    impactRadius: Math.max(4, Math.min(9, unit * .012)) };
}

/** A single energy shot ignites plasma; no glass or branching lightning stage. */
export function introPortalFormation(seconds: number) {
  const t = clamp(seconds, 0, 2.75);
  return {
    charge: 0,
    seam: 0,
    crack: 0,
    extent: smooth(.42, 1.6, t),
    aspect: .035 + .965 * smooth(.65, 2.55, t),
    rim: smooth(.42, .85, t),
    alignment: smooth(.42, 2.45, t),
  };
}

/** Existing wall ink charges as we approach; its geometry never appears at the lens. */
export function introCaptionInk(frame: IntroFrame, index: number, u: number) {
  const depth = frame.z - INTRO_CAPTIONS[index].z;
  const charge = 1 - smooth(850, 4800, depth);
  const front = index === 0 ? u * .32 : Math.abs(u - .5) * .64;
  return .48 + .52 * smooth(front, front + .65, charge);
}

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

/** Reading advances away from the viewer on either wall. */
export function introCaptionPoint(view: IntroTunnelView, frame: IntroFrame, index: number, u: number, v: number) {
  const caption = INTRO_CAPTIONS[index];
  const z = caption.z + (.5 - u) * (view.width < 600 ? 900 : 1500);
  const angle = (caption.side > 0 ? -.14 : Math.PI + .14) + (v - .5) * caption.side * .26;
  return projectTunnelWall(view, frame, angle - introWallTwist(z), z, .98);
}

/** Right-wall words face the viewer while their reading order recedes in Z. */
export function introCaptionGlyphU(index: number, from: number, to: number, progress: number) {
  return INTRO_CAPTIONS[index].side > 0 ? to - (to - from) * progress : from + (to - from) * progress;
}

/** One gentle angular clock for the lip, wall and canvas recovery material. */
export const introVortexAngle = (_radius: number, time: number) => time * .10;

/** The sky stays fixed while the fracture and portal animate in front of it. */
export function introWarpPoint(x: number, y: number, _core: { x: number; y: number }, _reach: number, _opening: number, _time: number) {
  return { x, y };
}
