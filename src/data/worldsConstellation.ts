/** A shallow concave sky: stable addresses, never a row relative to selection. */
export const WORLD_FIELD_FOCAL = 1100;
const addresses = [
  [-.76,-.64],[-.25,-.74],[.31,-.68],[.80,-.51],
  [-.90,.08],[.88,.20],[-.73,.66],[-.35,.61],[.65,.68],
] as const;

/** Stop at the first/last world; neither boundary wraps or exits. */
export function clampWorldIndex(index: number) {
  return Math.max(0, Math.min(addresses.length - 1, index));
}

/** Horizontal intent wins only after a deliberate drag; vertical touch is not navigation. */
export function worldDragDirection(dx: number, dy: number, velocityX = 0) {
  if (![dx, dy, velocityX].every(Number.isFinite) || Math.abs(dx) < 20 || Math.abs(dx) <= Math.abs(dy) * 1.15) return 0;
  const projected = dx + (Math.sign(velocityX) === Math.sign(dx) ? velocityX * 100 : 0);
  if (Math.abs(dx) < 54 && Math.abs(projected) < 90) return 0;
  return dx < 0 ? 1 : -1;
}

/** Follow the hand across the rail; resist gently when pulling beyond either end. */
export function worldDragOffset(dx: number, width: number, selected: number) {
  if (!Number.isFinite(dx) || !Number.isFinite(width) || width <= 0) return 0;
  const edge = selected === 0 && dx > 0 || selected === 8 && dx < 0;
  const limit = width * (edge ? .1 : .65);
  return Math.sign(dx) * limit * (1 - Math.exp(-Math.abs(dx) * (edge ? .65 : .9) / limit));
}

export function worldPortalPose(index: number, selected: number) {
  if(index===selected)return {x:0,y:0,z:0,pitch:0,yaw:0,roll:0,opacity:1};
  const [x,y]=addresses[index];
  const depth=.48+.30*(x*x*.65+y*y),projection=1+depth;
  return {x:x*44*projection,y:y*27*projection,z:-WORLD_FIELD_FOCAL*depth,
    pitch:y*14,yaw:-x*22,roll:x*y*5,opacity:index<selected?.52:.70};
}
