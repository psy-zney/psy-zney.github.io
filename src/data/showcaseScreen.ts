/** One continuous cylindrical surface, sampled by CSS3D image strips and its rim. */
export const SHOWCASE_SCREEN_ARC = 1.08;
export const SHOWCASE_SCREEN_STRIPS = 21;
export function showcaseScreenPoint(u: number) {
  const angle = (u - .5) * SHOWCASE_SCREEN_ARC;
  const radius = 1 / (2 * Math.sin(SHOWCASE_SCREEN_ARC / 2));
  return { x: radius * Math.sin(angle), z: radius * (1 - Math.cos(angle)), angle };
}
