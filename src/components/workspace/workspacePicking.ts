import { Box3, Ray, Vector3 } from 'three';
import { workspaceAssets, workspaceItems, type WorkspaceItemId } from '../../data/workspaceManifest';
export const workspaceProxies = workspaceItems.map(item => {
  const anchor = workspaceAssets.anchors[item.id];
  const bounds = new Box3(new Vector3(...anchor.min), new Vector3(...anchor.max));
  bounds.expandByVector(bounds.getSize(new Vector3()).multiplyScalar(.04));
  return { id: item.id, bounds };
});
/** Proxy padding improves aim without letting a selection pass a real surface. */
export function proxyHit(ray: Ray, firstSurfaceDistance = Infinity): WorkspaceItemId | null {
  let nearest = firstSurfaceDistance + .03, selected: WorkspaceItemId | null = null;
  const point = new Vector3();
  for (const proxy of workspaceProxies) if (ray.intersectBox(proxy.bounds, point)) {
    const distance = ray.origin.distanceTo(point);
    if (distance < nearest) { nearest = distance; selected = proxy.id; }
  }
  return selected;
}
export const pointerThreshold = (type = 'mouse') => type === 'touch' || type === 'pen' ? { distance: 12, duration: 450 } : { distance: 6, duration: 500 };
/** A gesture belongs to one pointer; dragging and long holds never open content. */
export function isWorkspaceTap(start: { startX: number; startY: number; at: number; id: number; moved: boolean; pointerType?: string } | null, end: { pointerId: number; clientX: number; clientY: number }, now: number) {
  const threshold = pointerThreshold(start?.pointerType);
  return !!start && start.id === end.pointerId && !start.moved && now-start.at >= 0 && now-start.at <= threshold.duration && Math.hypot(end.clientX-start.startX,end.clientY-start.startY) <= threshold.distance;
}
