/** Deliberate scene scales: interstellar gaps are larger than local systems. */
import { projects, capabilities } from './portfolio';
import { PROJECT_RADII, SKILL_RADII } from './celestialRegistry';
const orbitLength = Math.hypot(.55, .34);
export const ORBIT_PLANE = { vertical: .55 / orbitLength, depth: .34 / orbitLength } as const;

export const SPACE_LAYOUT = {
  interstellar: 24,
  far: 2400,
  projectOrbits: [24, 40, 64],
  skillOrbits: [24, 40],
  asteroidInner: 50,
  asteroidOuter: 54,
  desktopCamera: { offset: 28, distance: 125, framing: 24 },
  mobileCamera: { rise: 16, distance: 180, framingY: 25 },
} as const;

// Phone systems are rendered at .72 scale; keep the inner path outside the
// unscaled stellar disk instead of shrinking it into the star.
export function orbitRadii(skills = false, mobile = false) {
  return mobile ? (skills ? [30, 50] : [30, 50, 78]) : [...(skills ? SPACE_LAYOUT.skillOrbits : SPACE_LAYOUT.projectOrbits)];
}

// Physical star distances stay vast; scroll lengths have a bounded reading pace.
export const FLIGHT_TRACK_VH = [180, 160, 300, 220, 280, 300, 240] as const;
export const planetRadius = (index: number, skills = false) =>
  skills ? SKILL_RADII[capabilities[index].id] : PROJECT_RADII[projects[index].id];

const seeded = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453;
  return n - Math.floor(n);
};
export function asteroidLayout(count: number, mobile = false) {
  return Array.from({ length: count }, (_, i) => {
    const angle = seeded(i + 730) * Math.PI * 2;
    const inner = mobile ? 62 : SPACE_LAYOUT.asteroidInner, outer = mobile ? 67 : SPACE_LAYOUT.asteroidOuter;
    const radius = inner + seeded(i + 910) * (outer - inner);
    const height = (seeded(i + 1210) - .5) * 1.4;
    return {
      radius, angle, height,
      position: [Math.cos(angle) * radius, Math.sin(angle) * radius * ORBIT_PLANE.vertical, Math.sin(angle) * radius * ORBIT_PLANE.depth + height],
      scale: .12 + seeded(i + 440) ** 2 * .45,
      rotation: [seeded(i + 320) * Math.PI, seeded(i + 640) * Math.PI, angle],
    };
  });
}
