/** Deliberate scene scales: interstellar gaps are larger than local systems. */
export const ORBIT_PLANE = { vertical: .55, depth: .34 } as const;

export const SPACE_LAYOUT = {
  interstellar: 24,
  far: 2400,
  projectOrbits: [22, 36, 54],
  skillOrbits: [22, 36],
  asteroidInner: 42,
  asteroidOuter: 50,
  desktopCamera: { offset: 28, distance: 125, framing: 24 },
  mobileCamera: { rise: 16, distance: 180, framingY: 25 },
} as const;

// Phone systems are rendered at .72 scale; keep the inner path outside the
// unscaled stellar disk instead of shrinking it into the star.
export function orbitRadii(skills = false, mobile = false) {
  return (skills ? SPACE_LAYOUT.skillOrbits : SPACE_LAYOUT.projectOrbits).map(radius => mobile ? Math.max(30, radius) : radius);
}

// Physical star distances stay vast; scroll lengths have a bounded reading pace.
export const FLIGHT_TRACK_VH = [180, 160, 300, 220, 280, 300, 240] as const;
export const planetRadius = (index: number, skills = false) =>
  (skills ? [.72, .9, .62, .82, 1] : [.8, 1.1, .65, .88, 1.25, .7, 1, 1.4, .76, 1.15])[index] * 1.6;

const seeded = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453;
  return n - Math.floor(n);
};
export function asteroidLayout(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = seeded(i + 730) * Math.PI * 2;
    const radius = SPACE_LAYOUT.asteroidInner + seeded(i + 910) * (SPACE_LAYOUT.asteroidOuter - SPACE_LAYOUT.asteroidInner);
    const height = (seeded(i + 1210) - .5) * 1.4;
    return {
      radius, angle, height,
      position: [Math.cos(angle) * radius, Math.sin(angle) * radius * ORBIT_PLANE.vertical, Math.sin(angle) * radius * ORBIT_PLANE.depth + height],
      scale: .12 + seeded(i + 440) ** 2 * .45,
      rotation: [seeded(i + 320) * Math.PI, seeded(i + 640) * Math.PI, angle],
    };
  });
}
