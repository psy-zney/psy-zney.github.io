import { Vector3 } from 'three';
import { workspaceAssets } from '../../data/workspaceManifest';

export type WorkspaceInput = 'mouse' | 'touch';
export type RoomView = 'desk' | 'overview' | 'bookshelf' | 'paper' | 'lanyard';
export type MoveInput = { x: number; y: number };
export const roomViews: { id: RoomView; title: string }[] = [
  { id: 'desk', title: 'Desk' }, { id: 'overview', title: 'Room' },
  { id: 'bookshelf', title: 'Library' }, { id: 'paper', title: 'Resume' },
  { id: 'lanyard', title: 'Contact' },
];
// The source desk ends at x=5.86 and the shelf at x=3.27. The viewer moves
// along the clear aisle outside both, with a margin for the camera near plane.
export const WALK_AREA = { minX: 7, maxX: 16, minZ: -15, maxZ: 14 };
export function roomViewPose(view: RoomView, portrait: boolean) {
  const position: [number, number, number] = view === 'overview' ? [portrait ? 16 : 14, 11, 0]
    : view === 'bookshelf' ? [9.5, 7.8, -.5]
    : view === 'paper' ? [7.5, 9.8, 8.5]
    : view === 'lanyard' ? [7.5, 9.6, 6.2]
    : [portrait ? 9.5 : 7.5, portrait ? 11.4 : 10.5, .85];
  const target: [number, number, number] = view === 'overview' ? [-1, 6.5, -1.5]
    : view === 'desk' ? [-3.86, 8.5, .85] : [workspaceAssets.anchors[view].center[0],workspaceAssets.anchors[view].center[1],workspaceAssets.anchors[view].center[2]];
  return { position, target };
}
/** Seconds are capped after a suspended tab; diagonals keep the same speed. */
export function walkPosition(position: Vector3, yaw: number, input: MoveInput, delta: number, out = new Vector3()) {
  const length = Math.max(1, Math.hypot(input.x, input.y));
  const speed = 3.2 * Math.min(.05, Math.max(0, delta));
  const side = input.x / length, forward = input.y / length;
  return out.set(
    Math.max(WALK_AREA.minX, Math.min(WALK_AREA.maxX, position.x + (Math.cos(yaw)*side-Math.sin(yaw)*forward)*speed)),
    position.y,
    Math.max(WALK_AREA.minZ, Math.min(WALK_AREA.maxZ, position.z + (-Math.sin(yaw)*side-Math.cos(yaw)*forward)*speed)),
  );
}
