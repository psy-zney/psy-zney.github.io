export const TUNNEL_WORLD_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** CSS3D and WebGL share these world units; one URL occupies one station. */
export function tunnelStation(index: number, radius: number, focal: number) {
  const angle = index * TUNNEL_WORLD_ANGLE;
  return { x: Math.sin(angle) * radius * .5, y: Math.cos(angle) * radius * .28,
    z: -index * focal * .9, angle };
}

export function tunnelVisibility(distance: number, lookingBack = false) {
  if (Math.abs(distance) > 3.2) return 0;
  if (lookingBack) return Math.max(.18, 1 - Math.abs(distance) * .22);
  if (distance < -.65) return 0;
  if (distance < 0) return Math.max(0, 1 + distance / .65);
  // Keep the destination legible as depth, without stacking bright websites
  // over the active world's content. Arrival continuously restores its light.
  return Math.max(.08, Math.exp(-distance * 1.35));
}

/** Portals sit between the resting URL stations, on the actual camera path. */
export function tunnelPortal(index: number, focal = 1) {
  return tunnelStation(index + .5, focal * .72, focal);
}

export function tunnelCrossing(slot: number, reduced = false) {
  if (reduced) return 0;
  return Math.sin(Math.PI * (slot - Math.floor(slot))) ** 6;
}

export function portalPreviewPresence(crossing: number) {
  const p = Math.max(0, Math.min(1, (crossing - .15) / .60));
  return 1 - p * p * (3 - 2 * p);
}

export function tunnelWorldBlend(slot: number, count: number) {
  const value = Math.max(0, Math.min(count - 1, slot));
  const from = Math.floor(value), t = value - from;
  return { from, to: Math.min(count - 1, from + 1), blend: t * t * (3 - 2 * t) };
}

/** A rounded electrical discharge, staggered across gates rather than a strobe. */
export function portalLightning(time: number, index: number) {
  const phase = ((time + index * .83) % 5.6 + 5.6) % 5.6;
  return phase < .8 ? Math.sin(phase / .8 * Math.PI) ** 2 : 0;
}
