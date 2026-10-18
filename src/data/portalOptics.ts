import { clamp, smooth } from './virgoFlight';
import { singularitySeed } from './singularityMotion';

/** Elliptical screen-space radius: the central 60% is exactly undistorted. */
export function peripheralMask(u: number, v: number, aspect = 1) {
  return smooth(.60, 1.12, Math.hypot((u - .5) * aspect, v - .5) * 2);
}

/** beta = v/c in vacuum; physical emission requires beta*n > 1. */
export function cherenkovAngle(beta: number, refractiveIndex: number) {
  return beta * refractiveIndex > 1 ? Math.acos(1 / (beta * refractiveIndex)) : 0;
}

/** Analytic position, never integrated: decreasing time reverses every particle exactly. */
export function whiteHoleParticle(index: number, progress: number, layer: number) {
  const p = clamp(progress), seed = singularitySeed(index + layer * 401);
  const angle = index * 2.399963 + layer * .8 + p * (.035 + layer * .02);
  const depth = 1 + layer * 1.7;
  const radius = (.018 + seed * .22 + p * p * (1.6 + seed * 1.5)) / Math.sqrt(depth);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
    size: (.7 + seed * 1.7) / Math.sqrt(depth),
    opacity: (1 - smooth(.65, 1, p)) * (.25 + seed * .6) / (1 + layer * .32), depth };
}

export const PERIPHERAL_OPTICS_GLSL = /* glsl */ `
  float peripheralMask(vec2 uv, vec2 resolution) {
    vec2 p = (uv - .5) * vec2(resolution.x / resolution.y, 1.);
    return smoothstep(.60, 1.12, length(p) * 2.);
  }
  // Cauchy-style indices across R/G/B; the artistic beta is deliberately explicit.
  vec3 opticalCone(vec2 uv, vec2 resolution, float beta, float phase) {
    vec2 p = (uv - .5) * vec2(resolution.x / resolution.y, 1.);
    float r = length(p), mask = peripheralMask(uv, resolution);
    vec3 index = vec3(1.315, 1.335, 1.36);
    vec3 cosTheta = 1. / max(vec3(1.0001), beta * index);
    vec3 tanTheta = sqrt(max(vec3(0.), 1. - cosTheta*cosTheta)) / cosTheta;
    vec3 light = vec3(0.);
    for(int i=0;i<7;i++) {
      float z = .8 + float(i)*.32;
      vec3 projected = .64 * tanTheta * (1. - .35/z);
      vec3 shell = exp(-pow((vec3(r)-projected)/(.009+z*.003),vec3(2.)));
      light += shell * (.018/(1.+z)) * (.7+.3*sin(phase*5.-z*4.));
    }
    return light * vec3(.10,.48,1.) * mask * smoothstep(vec3(1.),vec3(1.03),beta*index);
  }
`;
