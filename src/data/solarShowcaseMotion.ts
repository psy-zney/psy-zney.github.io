import { clamp, smooth } from './virgoFlight';

/** Seconds shared by the WebGL core dive and the DOM cylinder handoff. */
export const SOLAR_PASSAGE = { prepare: 1.5, handoff: 2.6, duration: 4, destinationZ: -2500 } as const;

export function solarPassageSample(seconds: number) {
  const prepare = smooth(0, SOLAR_PASSAGE.prepare, seconds);
  const dive = clamp((seconds - SOLAR_PASSAGE.prepare) / (SOLAR_PASSAGE.handoff - SOLAR_PASSAGE.prepare));
  return {
    prepare, dive: dive ** 3,
    arc: Math.sin(prepare * Math.PI) * .18,
    center: smooth(.35, SOLAR_PASSAGE.prepare, seconds),
    roll: smooth(1.5, 2.3, seconds) * Math.PI / 18,
    flash: smooth(2.30, 2.50, seconds),
    narration: 1 - smooth(.65, 1.5, seconds),
    orbitSpeed: 1 + 3 * prepare,
  };
}

export function cylinderRevealSample(seconds: number, reduced = false) {
  if (reduced) return { cameraZ: SOLAR_PASSAGE.destinationZ, y: 0, tilt: 0, fan: 0, flash: 0, complete: true };
  const progress = clamp(seconds);
  const ease = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
  return {
    cameraZ: SOLAR_PASSAGE.destinationZ + 1000 * (1 - ease),
    y: -300 * (1 - ease), tilt: .4 * (1 - ease), fan: .12 * (1 - ease),
    // The 0.2s white-gold plateau straddles the renderer handoff.
    flash: 1 - smooth(.10, .40, seconds), complete: seconds >= 1.4,
  };
}
