/** These page transitions never supply coordinates to the interstation camera. */
const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const ease = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p); };
export const SHOWCASE_PASSAGE_DURATION = 1.1;
export const SHOWCASE_HANDOFF = .04;

export function universeFrame(progress: number) {
  const p = clamp(progress);
  return { progress: p, slide: 0, bend: Math.sin(p * Math.PI) * .022 };
}

export function introTunnelFrame(progress: number) {
  const p = clamp(progress), enter = ease((p - .04) / .14);
  return { progress: p, opacity: enter, bend: Math.sin(clamp(p / .18) * Math.PI) * .025,
    travel: ease((p - .08) / .92) * 158, backdrop: enter * (1 - ease((p - .65) / .16)),
    phase: p < .18 ? 'entry' : p < .82 ? 'nebula-flight' : 'home-reveal' };
}

export function showcaseSlideFrame(progress: number) {
  const p = clamp(progress);
  return { progress: p, slide: ease((p - SHOWCASE_HANDOFF) / (1 - SHOWCASE_HANDOFF)), showcase: p >= SHOWCASE_HANDOFF };
}

export function rotateUniversePoint(x: number, y: number, z: number, yaw: number, pitch: number) {
  const rx = x * Math.cos(yaw) - z * Math.sin(yaw), rz = x * Math.sin(yaw) + z * Math.cos(yaw);
  return { x: rx, y: y * Math.cos(pitch) - rz * Math.sin(pitch), z: y * Math.sin(pitch) + rz * Math.cos(pitch) };
}

/** Local intro motion only; the interstation camera never consumes this curve. */
export function nebulaCenter(travel: number) {
  return { x: Math.sin(travel * .047) * .7, y: Math.sin(travel * .069) * .95 + Math.sin(travel * .123) * .25 };
}

/** Continuous folded wall. Adjacent depths share vertices, rather than stacked rings. */
export function nebulaWallRadius(angle: number, z: number) {
  const fold = angle * 3 + z * .12 + Math.sin(angle * 2 - z * .047) * .8;
  return 6 + Math.sin(fold) * .72 + Math.sin(angle * 5 - z * .11) * .34
    + Math.sin(angle * 9 + z * .31 + Math.sin(z * .14)) * .12;
}

export function universeInput(current: number, target: number, pixels: number) {
  if (!Number.isFinite(pixels) || !pixels) return clamp(target);
  const p = clamp(current), pending = clamp(target);
  const base = Math.sign(pixels) === Math.sign(pending - p) ? pending : p;
  return clamp(Math.max(p - .3, Math.min(p + .3, base + pixels / 950)));
}

export function followUniverse(current: number, target: number, delta: number) {
  const p = clamp(current), goal = clamp(target), dt = Math.max(0, Math.min(.05, Number.isFinite(delta) ? delta : 0));
  const next = p + (goal - p) * (1 - Math.exp(-18 * dt));
  return Math.abs(next - goal) < .0003 ? goal : next;
}
