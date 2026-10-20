export type CelestialClocks = { ambient: number; orbits: number[] };

/** Pausing a focused planet must not stop the surrounding universe. */
export function advanceCelestialClocks(clocks: CelestialClocks, delta: number, options: {
  paused: boolean; reduced: boolean; focused: number | null; rate?: number;
}) {
  if (options.paused || options.reduced || !Number.isFinite(delta) || delta <= 0) return;
  const step = Math.min(delta, .05) * (options.rate ?? 1);
  clocks.ambient += step;
  for (let i = 0; i < clocks.orbits.length; i++) if (i !== options.focused) clocks.orbits[i] += step;
}
