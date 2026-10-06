import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { itemFromObject, workspaceAssets, type WorkspaceItemId } from '../../data/workspaceManifest';
import { proxyHit, isWorkspaceTap, pointerThreshold } from './workspacePicking';
import { roomViewPose, walkPosition, type MoveInput, type RoomView, type WorkspaceInput } from './workspaceNavigation';
import { workspaceMotion, WORKSPACE_COMPACT_MEDIA } from '../../data/motionTokens';

export function WorkspaceControls({ room, disabled, focusItem, locked, tilt, onTarget, onSelect, onLock, onFocusComplete, recenter, pose, position, navigation, activeView, drive, input, reduced, onViewChange, onReturnComplete, onMonitorSurface }: {
  onMonitorSurface: (surface: { x: number; y: number; width: number; height: number } | null) => void;
  room: THREE.Object3D; disabled: boolean; focusItem: WorkspaceItemId | null; locked: boolean;
  tilt: MutableRefObject<{ yaw: number; pitch: number }>;
  onTarget: (item: WorkspaceItemId | null) => void; onSelect: (item: WorkspaceItemId) => void;
  onLock: (locked: boolean) => void; onFocusComplete: () => void; recenter: () => void;
  pose: MutableRefObject<THREE.Quaternion | null>; onReturnComplete: () => void;
  position: MutableRefObject<THREE.Vector3 | null>; navigation: { view: RoomView; serial: number }; activeView: RoomView | 'free';
  drive: MutableRefObject<MoveInput>; input: WorkspaceInput; reduced: boolean; onViewChange: (view: RoomView | 'free') => void;
}) {
  const { camera, gl, invalidate, size } = useThree();
  const base = useRef({ yaw: 0, pitch: 0 }), look = useRef({ yaw: 0, pitch: 0 });
  const gyroLook = useRef({ yaw: 0, pitch: 0 }), dragGyro = useRef({ yaw: 0, pitch: 0 });
  const offsetQuaternion = useRef(new THREE.Quaternion());
  const target = useRef<WorkspaceItemId | null>(null), pending = useRef<WorkspaceItemId | null>(null);
  const callbacks = useRef({ onTarget, onSelect, onLock, onFocusComplete, recenter, onReturnComplete, onViewChange }); callbacks.current = { onTarget, onSelect, onLock, onFocusComplete, recenter, onReturnComplete, onViewChange };
  const interaction = useRef({ disabled, locked, input }); interaction.current = { disabled, locked, input };
  const returning = useRef(false), returnPose = useRef<THREE.Quaternion | null>(null);
  const transition = useRef<{ from: THREE.Quaternion; to: THREE.Quaternion; time: number; duration: number; revealAt?: number; handedOff?: boolean; complete: boolean; navigation?: boolean; screen?: boolean; fromPosition?: THREE.Vector3; toPosition?: THREE.Vector3 } | null>(null);
  const monitorReturn = useRef(false);
  const returnPosition = useRef<THREE.Vector3 | null>(null);
  const raycaster = useRef(new THREE.Raycaster()), pointer = useRef(new THREE.Vector2());
  const scratch = useRef(new THREE.PerspectiveCamera()), lastRay = useRef(0), candidate = useRef({ id: null as WorkspaceItemId | null, since: 0 });
  const drag = useRef<{ x: number; y: number; startX: number; startY: number; at: number; id: number; moved: boolean; pointerType: string } | null>(null);
  const pointers = useRef(new Set<number>()), keys = useRef(new Set<string>());
  const movingPosition = useRef(new THREE.Vector3()), view = useRef<RoomView | 'free'>(activeView);
  const portrait = size.width < size.height;
  const appliedView = useRef({ initialized: false, serial: navigation.serial, portrait });
  const select = (item: WorkspaceItemId) => {
    if (document.pointerLockElement === gl.domElement) { pending.current = item; document.exitPointerLock(); }
    else callbacks.current.onSelect(item);
  };
  const sample = (x: number, y: number) => {
    pointer.current.set(x, y); raycaster.current.setFromCamera(pointer.current, camera);
    // The first visible surface determines occlusion. Static merged meshes are
    // part of this raycast, so the room never selects through a wall or desk.
    const hits = raycaster.current.intersectObject(room, true);
    const hit = hits.find(item => item.object.visible);
    return hit && itemFromObject(hit.object) || proxyHit(raycaster.current.ray, hit?.distance);
  };
  useEffect(() => {
    if (disabled || focusItem) return;
    const previous = appliedView.current;
    if (!previous.initialized) {
      if (position.current && pose.current) { camera.position.copy(position.current); camera.quaternion.copy(pose.current); }
      else { const preset = roomViewPose(navigation.view,portrait); camera.position.set(...preset.position); camera.lookAt(...preset.target); }
    } else if (navigation.serial !== previous.serial || portrait !== previous.portrait && view.current !== 'free') {
      const nextView = navigation.serial !== previous.serial ? navigation.view : view.current as RoomView;
      const preset = roomViewPose(nextView,portrait);
      scratch.current.position.set(...preset.position); scratch.current.lookAt(...preset.target);
      transition.current = { from:camera.quaternion.clone(), to:scratch.current.quaternion.clone(), fromPosition:camera.position.clone(), toPosition:scratch.current.position.clone(), time:performance.now(), duration:reduced ? 0 : input === 'touch' ? .4 : .6, complete:false, navigation:true };
      view.current = nextView; callbacks.current.onViewChange(nextView); callbacks.current.recenter();
      keys.current.clear(); drive.current = { x:0,y:0 };
    }
    appliedView.current = { initialized:true, serial:navigation.serial, portrait };
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');
    base.current = { yaw:euler.y, pitch:euler.x }; look.current = { ...base.current };
    pose.current = camera.quaternion.clone(); position.current = camera.position.clone(); invalidate();
  }, [camera, portrait, navigation.serial, disabled, focusItem, reduced]);
  useEffect(() => {
    if (disabled || focusItem) {
      keys.current.clear(); drive.current = { x:0,y:0 }; drag.current = null;
      for (const id of pointers.current) if (gl.domElement.hasPointerCapture(id)) gl.domElement.releasePointerCapture(id);
      pointers.current.clear();
    }
  }, [disabled,focusItem,drive,gl]);
  useEffect(() => {
    const timing = workspaceMotion(window.matchMedia(WORKSPACE_COMPACT_MEDIA).matches, window.matchMedia('(prefers-reduced-motion:reduce)').matches);
    if (focusItem) {
      returnPose.current ??= camera.quaternion.clone();
      returnPosition.current ??= camera.position.clone();
      scratch.current.position.copy(camera.position);
      scratch.current.lookAt(new THREE.Vector3(...workspaceAssets.anchors[focusItem].center));
      monitorReturn.current = focusItem === 'screen';
      const advance = new THREE.Vector3(...workspaceAssets.anchors[focusItem].center).sub(camera.position).normalize().multiplyScalar(.25);
      transition.current = { from: camera.quaternion.clone(), to: scratch.current.quaternion.clone(), time: performance.now(), screen: focusItem === 'screen', fromPosition: camera.position.clone(), toPosition: focusItem === 'screen' ? camera.position.clone().add(advance) : camera.position.clone(),
        duration: (focusItem === 'screen' ? timing.monitorFocus : timing.focus) / 1000,
        revealAt: (focusItem === 'screen' ? timing.monitorAt : timing.readerAt) / 1000, complete: true };
    } else if (returnPose.current) {
      returning.current = true;
      transition.current = { from: camera.quaternion.clone(), to: returnPose.current.clone(), fromPosition: camera.position.clone(), toPosition: returnPosition.current ?? camera.position.clone(), time: performance.now(), duration: (monitorReturn.current ? timing.monitorReturn : timing.readerReturn) / 1000, complete: false };
    }
    invalidate();
  }, [focusItem, camera, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lockChange = () => {
      const isLocked = document.pointerLockElement === canvas;
      if (!isLocked) { keys.current.clear(); drive.current = { x:0,y:0 }; }
      callbacks.current.onLock(isLocked);
      if (!isLocked && pending.current) { const item = pending.current; pending.current = null; callbacks.current.onSelect(item); }
    };
    const lockError = () => callbacks.current.onLock(false);
    const point = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      return [((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1];
    };
    const down = (event: PointerEvent) => {
      if (interaction.current.disabled || transition.current || event.button !== 0) return;
      if (document.pointerLockElement === canvas) { if (target.current) select(target.current); return; }
      pointers.current.add(event.pointerId);
      // Capture every finger until release, including the second one. Otherwise
      // a release over the HUD could leave the scene stuck in multi-touch mode.
      canvas.setPointerCapture(event.pointerId);
      if (pointers.current.size !== 1) { drag.current = null; callbacks.current.recenter(); return; }
      dragGyro.current = { ...gyroLook.current };
      drag.current = { x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,at:performance.now(),id:event.pointerId,moved:false,pointerType:event.pointerType };
      canvas.focus({ preventScroll:true });
    };
    const move = (event: PointerEvent) => {
      if (interaction.current.disabled || transition.current) return;
      let dx = 0, dy = 0;
      if (document.pointerLockElement === canvas) { dx = event.movementX; dy = event.movementY; }
      else if (drag.current?.id === event.pointerId) {
        const start = drag.current;
        if (!start.moved && Math.hypot(event.clientX-start.startX,event.clientY-start.startY) <= pointerThreshold(start.pointerType).distance) return;
        dx = event.clientX - start.x; dy = event.clientY - start.y;
        drag.current.x = event.clientX; drag.current.y = event.clientY;
        drag.current.moved = true;
      } else {
        if (event.pointerType !== 'mouse' || interaction.current.input !== 'mouse' || pointers.current.size) return;
        if (performance.now() - lastRay.current < 33) return;
        lastRay.current = performance.now();
        const [x, y] = point(event); const item = sample(x, y);
        target.current = item; callbacks.current.onTarget(item); return;
      }
      const sensitivity = event.pointerType === 'mouse' ? .0018 : .003;
      base.current.yaw -= dx * sensitivity; base.current.pitch = THREE.MathUtils.clamp(base.current.pitch - dy * sensitivity, -Math.PI / 3, 55 * Math.PI / 180);
      base.current.yaw = Math.atan2(Math.sin(base.current.yaw), Math.cos(base.current.yaw)); invalidate();
    };
    const up = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId);
      const start = drag.current?.id === event.pointerId ? drag.current : null;
      if (start) drag.current = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (!start) return;
      if (!isWorkspaceTap(start,event,performance.now()) || interaction.current.disabled) { callbacks.current.recenter(); return; }
      const [x, y] = point(event); let item = sample(x, y);
      // Small screen-space aim assistance on touch keeps every ray's occlusion.
      if (!item && event.pointerType !== 'mouse') for (const [dx,dy] of [[10,0],[-10,0],[0,10],[0,-10]]) {
        item = sample(x+2*dx/canvas.clientWidth,y+2*dy/canvas.clientHeight); if (item) break;
      }
      if (item) select(item);
    };
    const cancel = () => { drag.current = null; for (const id of pointers.current) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id); pointers.current.clear(); callbacks.current.recenter(); };
    const lostCapture = (event: PointerEvent) => { pointers.current.delete(event.pointerId); if (drag.current?.id === event.pointerId) { drag.current = null; callbacks.current.recenter(); } };
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,[contenteditable=true],dialog,.zney-os')) return;
      if (event.code === 'Tab' && document.pointerLockElement === canvas) { document.exitPointerLock(); return; }
      if (interaction.current.disabled || transition.current) return;
      if (['KeyW','KeyA','KeyS','KeyD'].includes(event.code) && (document.pointerLockElement === canvas || document.activeElement === canvas)) { event.preventDefault(); keys.current.add(event.code); invalidate(); }
      if (event.code === 'KeyE' && !event.repeat && document.pointerLockElement === canvas && target.current) { event.preventDefault(); select(target.current); }
      const delta = { ArrowLeft: [.06, 0], ArrowRight: [-.06, 0], ArrowUp: [0, .04], ArrowDown: [0, -.04] }[event.code];
      if (delta && document.activeElement === canvas) { event.preventDefault(); base.current.yaw += delta[0]; base.current.pitch = THREE.MathUtils.clamp(base.current.pitch + delta[1], -Math.PI / 3, .96); invalidate(); }
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    const blur = () => { cancel(); keys.current.clear(); drive.current = { x:0,y:0 }; if (document.pointerLockElement === canvas) document.exitPointerLock(); };
    let hiddenAt = 0;
    const visibility = () => { if (document.hidden) { hiddenAt = performance.now(); blur(); } else if (hiddenAt) { if (transition.current) transition.current.time += performance.now()-hiddenAt; hiddenAt = 0; } };
    canvas.tabIndex = 0; canvas.setAttribute('aria-label', '3D room. Drag or use arrow keys to look, WASD to move. Tap or click an object to open it.');
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('lostpointercapture',lostCapture);
    window.addEventListener('keydown', key); window.addEventListener('keyup',keyUp); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility); document.addEventListener('pointerlockchange', lockChange); document.addEventListener('pointerlockerror', lockError);
    return () => { blur(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('lostpointercapture',lostCapture); window.removeEventListener('keydown', key); window.removeEventListener('keyup',keyUp); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('pointerlockchange', lockChange); document.removeEventListener('pointerlockerror', lockError); };
  }, [room, gl, camera, invalidate]);
  useFrame((_, delta) => {
    if (document.hidden) return;
    if (transition.current) {
      const t = transition.current, elapsed = (performance.now()-t.time)/1000, delay = t.screen && t.duration > .3 ? .12 : 0;
      const p = t.duration === 0 ? 1 : THREE.MathUtils.clamp((elapsed-delay)/(t.duration-delay),0,1), eased = p * p * (3 - 2 * p);
      camera.quaternion.slerpQuaternions(t.from, t.to, eased);
      if (t.fromPosition && t.toPosition) camera.position.lerpVectors(t.fromPosition,t.toPosition,eased);
      pose.current?.copy(camera.quaternion); position.current?.copy(camera.position);
      if (t.complete && !t.handedOff && elapsed >= (t.revealAt ?? t.duration)) {
        t.handedOff = true;
        if (t.screen) {
          camera.updateMatrixWorld();
          const { min, max } = workspaceAssets.anchors.screen;
          const corners = [[max[0],min[1],min[2]],[max[0],min[1],max[2]],[max[0],max[1],min[2]],[max[0],max[1],max[2]]].map(point => new THREE.Vector3(...point).project(camera));
          const xs = corners.map(point => (point.x+1)*size.width/2), ys = corners.map(point => (1-point.y)*size.height/2);
          const widths = [Math.abs(xs[1]-xs[0]),Math.abs(xs[3]-xs[2])], heights = [Math.abs(ys[2]-ys[0]),Math.abs(ys[3]-ys[1])];
          const stable = Math.min(...widths)/Math.max(...widths) > .95 && Math.min(...heights)/Math.max(...heights) > .95;
          const valid = stable && corners.every(point => point.z > 0 && point.z < 1 && Math.abs(point.x) < .96 && Math.abs(point.y) < .96);
          onMonitorSurface(valid ? { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs)-Math.min(...xs), height: Math.max(...ys)-Math.min(...ys) } : null);
        }
        callbacks.current.onFocusComplete();
      }
      if (p < 1) invalidate();
      else { transition.current = null; if (!t.complete) {
        if (!t.navigation) { returnPose.current = null; returnPosition.current = null; returning.current = false; }
        const restored = new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');
        base.current = { yaw: restored.y, pitch: restored.x }; look.current = { ...base.current }; gyroLook.current = { yaw: 0, pitch: 0 };
        callbacks.current.recenter(); if (!t.navigation) callbacks.current.onReturnComplete();
      } }
      return;
    }
    if (disabled || returning.current) return;
    const damping = reduced ? 1 : 1 - Math.exp(-18 * Math.min(delta, .05));
    const yawDelta = Math.atan2(Math.sin(base.current.yaw - look.current.yaw), Math.cos(base.current.yaw - look.current.yaw));
    look.current.yaw += yawDelta * damping; look.current.pitch += (base.current.pitch - look.current.pitch) * damping;
    const sensorDamping = 1 - Math.exp(-10 * Math.min(delta,.05));
    const sensorYaw = input === 'touch' ? tilt.current.yaw : 0, sensorPitch = input === 'touch' ? tilt.current.pitch : 0;
    if (drag.current) {
      const blend = 1 - THREE.MathUtils.clamp((performance.now()-drag.current.at)/120,0,1);
      gyroLook.current = { yaw: dragGyro.current.yaw * blend, pitch: dragGyro.current.pitch * blend };
    } else {
      gyroLook.current.yaw += (sensorYaw-gyroLook.current.yaw) * sensorDamping;
      gyroLook.current.pitch += (sensorPitch-gyroLook.current.pitch) * sensorDamping;
    }
    camera.quaternion.setFromEuler(new THREE.Euler(look.current.pitch, look.current.yaw, 0, 'YXZ'));
    offsetQuaternion.current.setFromEuler(new THREE.Euler(gyroLook.current.pitch,gyroLook.current.yaw,0,'YXZ'));
    camera.quaternion.multiply(offsetQuaternion.current);
    const movement = { x:drive.current.x + Number(keys.current.has('KeyD'))-Number(keys.current.has('KeyA')), y:drive.current.y + Number(keys.current.has('KeyW'))-Number(keys.current.has('KeyS')) };
    if (Math.hypot(movement.x,movement.y) > .01) {
      walkPosition(camera.position,look.current.yaw,movement,delta,movingPosition.current);
      if (movingPosition.current.distanceToSquared(camera.position) > .000001) {
        camera.position.copy(movingPosition.current);
        if (view.current !== 'free') { view.current = 'free'; callbacks.current.onViewChange('free'); }
      }
      invalidate();
    }
    pose.current?.copy(camera.quaternion);
    position.current?.copy(camera.position);
    if (Math.abs(yawDelta) > .0001 || Math.abs(base.current.pitch-look.current.pitch) > .0001 || Math.abs(sensorYaw-gyroLook.current.yaw) > .0001 || Math.abs(sensorPitch-gyroLook.current.pitch) > .0001) invalidate();
    if ((locked || input === 'touch') && performance.now() - lastRay.current >= (locked ? 50 : 100)) {
      lastRay.current = performance.now(); const id = sample(0, 0);
      if (candidate.current.id !== id) candidate.current = { id, since: performance.now() };
      if (target.current !== id && performance.now() - candidate.current.since >= (id ? 120 : 80)) { target.current = id; callbacks.current.onTarget(id); }
    }
  });
  return null;
}
