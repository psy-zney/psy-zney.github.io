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
export function worldDragDirection(dx: number, dy: number) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) < 54 || Math.abs(dx) <= Math.abs(dy) * 1.15) return 0;
  return dx < 0 ? 1 : -1;
}

export function worldPortalPose(index: number, selected: number) {
  if(index===selected)return {x:0,y:0,z:0,pitch:0,yaw:0,roll:0,opacity:1};
  const [x,y]=addresses[index];
  const depth=.48+.30*(x*x*.65+y*y),projection=1+depth;
  return {x:x*44*projection,y:y*27*projection,z:-WORLD_FIELD_FOCAL*depth,
    pitch:y*14,yaw:-x*22,roll:x*y*5,opacity:index<selected?.52:.70};
}
