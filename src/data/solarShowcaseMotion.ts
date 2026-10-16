import { clamp, smooth } from './virgoFlight';

/** Seconds shared by the WebGL core dive and the DOM cylinder handoff. */
export const SOLAR_PASSAGE = { prepare: 1.5, handoff: 2.6, duration: 3.7, destinationZ: -2500 } as const;

// These rotations belong only to the showcase ring, never the journey camera.
export const SHOWCASE_TURN = { radians: Math.PI * 2, enter: 1.1, exit: 1.4 } as const;
const handoffEase = (p: number) => p ** 3 * (10 + p * (-15 + 6 * p));
export const showcaseAngularStep = (count: number) => Math.PI * 2 / Math.max(1, count);
export function showcaseRingTurn(seconds: number, departing = false, direction = 1, reduced = false) {
  if (reduced) return { yaw: 0, roll: 0, depth: 0, complete: true };
  const duration = departing ? SHOWCASE_TURN.exit : SHOWCASE_TURN.enter;
  const p = clamp(seconds / duration);
  // Quintic endpoints join the resting ring with zero velocity/acceleration.
  const ease = handoffEase(p);
  const amount = departing ? ease : 1 - ease;
  return { yaw: departing ? 0 : direction * SHOWCASE_TURN.radians * amount,
    roll: departing || p === 0 || p === 1 ? 0 : direction * Math.sin(Math.PI * p) ** 2 * .08,
    depth: departing ? ease : 0, complete: p === 1 };
}

export function solarPassageSample(seconds: number) {
  const prepare = smooth(0, SOLAR_PASSAGE.prepare, seconds);
  const dive = clamp((seconds - SOLAR_PASSAGE.prepare) / (SOLAR_PASSAGE.handoff - SOLAR_PASSAGE.prepare));
  return {
    prepare, dive: dive ** 3,
    center: smooth(.35, SOLAR_PASSAGE.prepare, seconds),
    roll: 0,
    flash: smooth(2.30, 2.50, seconds),
    narration: 1 - smooth(.65, 1.5, seconds),
    orbitSpeed: 1 + 3 * prepare,
  };
}

export function cylinderRevealSample(seconds: number, reduced = false) {
  if (reduced) return { cameraZ: SOLAR_PASSAGE.destinationZ, y: 0, tilt: 0, fan: 0, flash: 0, complete: true };
  const progress = clamp(seconds / SHOWCASE_TURN.enter);
  const ease = handoffEase(progress);
  return {
    cameraZ: SOLAR_PASSAGE.destinationZ + 1000 * (1 - ease),
    y: -300 * (1 - ease), tilt: .4 * (1 - ease), fan: .12 * (1 - ease),
    // The 0.2s white-gold plateau straddles the renderer handoff.
    flash: 1 - smooth(.10, .40, seconds), complete: seconds >= SHOWCASE_TURN.enter,
  };
}
