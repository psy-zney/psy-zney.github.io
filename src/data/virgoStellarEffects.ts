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

export const stellarEmission = (index: number, position: number) => index === 2 ? 1 - smooth(5.30, 5.355, position) : 1;

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

/** The foreground explosion precedes the existing black-hole arrival. No camera controls. */
export function supernovaSample(position: number, reduced = false) {
  const progress = clamp((position - 5.30) / .32);
  return { progress, radius: 12 + 72 * (1 - (1 - progress) ** 2),
    opacity: reduced ? 0 : smooth(5.30, 5.33, position) * (1 - smooth(5.49, 5.62, position)),
    flash: smooth(0, .10, progress) * (1 - smooth(.15, .48, progress)) };
}
