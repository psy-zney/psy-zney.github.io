import { clamp, smooth } from './virgoFlight';

export const STELLAR_NOISE_GLSL = `
  float stellarHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float stellarNoise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(stellarHash(i),stellarHash(i+vec2(1,0)),f.x),
      mix(stellarHash(i+vec2(0,1)),stellarHash(i+vec2(1,1)),f.x),f.y);
  }
  float stellarFbm(vec2 p) {
    return .57*stellarNoise(p)+.28*stellarNoise(p*2.07+9.3)+.15*stellarNoise(p*4.13+21.7);
  }
`;

export const prominenceTiming = (seed: number) => ({ period: 8 + (seed * 1.73) % 4, duration: 3.2 + (seed * .37) % 1.2, offset: seed * 2.17 });

/** Short, staggered eruptions with a fully dark rest between them. */
export function prominenceSample(seed: number, time: number, reduced = false) {
  const { period, duration, offset } = prominenceTiming(seed);
  const phase = ((time + offset) % period + period) % period;
  const progress = clamp(phase / duration);
  return { progress, strength: reduced ? 0 : smooth(0, .25, progress) * (1 - smooth(.6, 1, progress)), lift: smooth(0, .55, progress) };
}

/** Both ends return to the photosphere; the loop rises above it in between. */
export function stellarProminence(index: number, radius: number) {
  const phi = index * 2.399963, latitude = Math.sin(index * 1.7) * .68;
  const normal = [Math.cos(phi) * Math.cos(latitude), Math.sin(phi) * Math.cos(latitude), Math.sin(latitude)];
  const tangent = [-Math.sin(phi), Math.cos(phi), 0];
  return Array.from({ length: 33 }, (_, i) => {
    const t = i / 32, angle = (t - .5) * .48;
    const r = radius * (1.015 + Math.sin(Math.PI * t) * (.22 + index % 3 * .045));
    return normal.map((n, axis) => (n * Math.cos(angle) + tangent[axis] * Math.sin(angle)) * r) as [number, number, number];
  });
}
