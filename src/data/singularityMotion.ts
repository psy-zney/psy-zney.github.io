import { clamp, smooth } from './virgoFlight';

export const SINGULARITY_ORBIT_END = 3.2;
export const SINGULARITY_THROAT_END = 5.6;
export const SINGULARITY_DURATION = 7.8;
export const SINGULARITY_HANDOFF = 4.3;
export const singularitySeed = (i: number) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

export function singularitySample(elapsed: number, direction: 1 | -1) {
  const t = direction > 0 ? clamp(elapsed, 0, SINGULARITY_DURATION) : SINGULARITY_DURATION - clamp(elapsed, 0, SINGULARITY_DURATION);
  return { t, phase: t < SINGULARITY_ORBIT_END ? 'accretion' : t < SINGULARITY_THROAT_END ? 'throat' : 'white-hole-exit',
    handoff: direction > 0 ? t >= SINGULARITY_HANDOFF : t <= SINGULARITY_HANDOFF,
    lens: smooth(0, 2.8, t) * (1 - smooth(3.0, SINGULARITY_ORBIT_END, t)),
    returnDepth: smooth(0, SINGULARITY_ORBIT_END, t), complete: elapsed >= SINGULARITY_DURATION };
}

/** Local camera spirals into the hole; the interstellar flight outside this passage stays unchanged. */
export function singularityView(seconds: number) {
  const q = clamp(seconds / SINGULARITY_ORBIT_END);
  const ease = smooth(0, 1, q), angle = -Math.PI * .7 + Math.PI * 2.9 * ease;
  const envelope = q === 0 || q === 1 ? 0 : Math.sin(Math.PI * q) ** 2;
  const radius = .43 * envelope * (1 - q * .7);
  return { x: radius ? Math.cos(angle) * radius : 0, y: radius ? Math.sin(angle) * radius * .58 : 0,
    depth: 1 - .97 * ease, bank: envelope ? Math.sin(angle) * envelope * .22 : 0,
    angle, complete: q === 1 };
}

/** Delayed tail contracts less than the head, producing tidal stretch and orbital shear. */
export function accretionFilament(index: number, seconds: number, along = 0) {
  const seed = singularitySeed(index), p = clamp(seconds / 1.8);
  const stretch = smooth(.15, .94, p);
  const age = Math.max(0, seconds - along * (.015 + .32 * stretch));
  const fall = clamp(age / 1.8);
  const radius = (.25 + seed * .58) * Math.exp(-4.8 * fall ** 3);
  const angle = index * 2.399963 + age * (5 + (1 - seed) * 5) + 12 * fall ** 3;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * .29,
    radius, angle, width: (1.4 + singularitySeed(index + 31) * 2.5) / (1 + stretch * 6), stretch };
}
