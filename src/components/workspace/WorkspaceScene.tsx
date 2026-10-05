import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei/web/Html.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { WorkspaceControls } from './WorkspaceControls';
import { workspaceAssets, workspaceItems, type WorkspaceItemId } from '../../data/workspaceManifest';
import { workspaceProxies } from './workspacePicking';
import { QUALITY, type QualityTier } from './useQualityTier';

type Props = { onMonitorSurface: (surface: { x: number; y: number; width: number; height: number } | null) => void; pose: MutableRefObject<THREE.Quaternion | null>; onReturnComplete: () => void; target: WorkspaceItemId | null; tier: QualityTier; paused: boolean; reduced: boolean; locked: boolean; focusItem: WorkspaceItemId | null;
  showLabels: boolean;
  tilt: MutableRefObject<{ yaw: number; pitch: number }>; onSelect: (id: WorkspaceItemId) => void; onTarget: (id: WorkspaceItemId | null) => void;
  onLock: (locked: boolean) => void; onReady: () => void; onProgress: (progress: number | null) => void;
  onError: () => void; onFocusComplete: () => void; recenter: () => void; onSlow: () => void; onHealthy: () => void;
};
function disposeRoom(room: THREE.Object3D) {
  const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
  room.traverse(node => { if (!(node instanceof THREE.Mesh)) return; resources.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      resources.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) resources.add(value);
    }
  }); resources.forEach(resource => resource.dispose());
}
function SelectionOutline({ id }: { id: WorkspaceItemId | null }) {
  const helper = useMemo(() => id ? new THREE.Box3Helper(workspaceProxies.find(proxy => proxy.id === id)!.bounds, '#b9e0ff') : null, [id]);
  useEffect(() => () => { if (helper) { helper.geometry.dispose(); (helper.material as THREE.Material).dispose(); } }, [helper]);
  return helper ? <primitive object={helper}/> : null;
}
function AnchorLabel({ id, onSelect, color, title }: { id: WorkspaceItemId; onSelect: Props['onSelect']; color: string; title: string }) {
  const { camera } = useThree();
  const label = useRef<HTMLDivElement>(null), projected = useRef(new THREE.Vector3());
  const position = useMemo(() => {
    const center = new THREE.Vector3(...workspaceAssets.anchors[id].center);
    const direction = center.clone().sub(camera.position).normalize();
    const front = new THREE.Ray(camera.position, direction).intersectBox(workspaceProxies.find(proxy => proxy.id === id)!.bounds, new THREE.Vector3()) ?? center;
    return front.addScaledVector(direction, -.15);
  }, [id, camera]);
  useFrame(({ camera, size }) => {
    projected.current.copy(position).project(camera);
    const visible = projected.current.z > -1 && projected.current.z < 1 && Math.abs(projected.current.x) < 1 - 160 / size.width && Math.abs(projected.current.y) < 1 - 144 / size.height;
    if (label.current) { label.current.hidden = !visible; label.current.inert = !visible; }
  });
  return <Html position={position} center occlude zIndexRange={[20, 0]}><div ref={label}><button className="room-hotspot" style={{ '--target-color': color } as React.CSSProperties} onClick={() => onSelect(id)} aria-label={title}><i/>{title} ↗</button></div></Html>;
}
function Room(props: Props) {
  const [room, setRoom] = useState<THREE.Group | null>(null);
  const { invalidate, gl, camera } = useThree(); const callbacks = useRef(props); callbacks.current = props;
  const frames = useRef<number[]>([]), windowAt = useRef(0), slowWindows = useRef(0), warmAt = useRef(performance.now());
  const goodAt = useRef(0), idleAt = useRef(performance.now()), previousPose = useRef(camera.quaternion.clone());
  const resourceAt = useRef(0);
  useEffect(() => {
    const reset = () => { frames.current = []; goodAt.current = 0; slowWindows.current = 0; warmAt.current = idleAt.current = windowAt.current = performance.now(); };
    document.addEventListener('visibilitychange', reset); return () => document.removeEventListener('visibilitychange', reset);
  }, []);
  useEffect(() => {
    const controller = new AbortController(); let owned: THREE.Group | null = null; let cancelled = false;
    const ktx = new KTX2Loader().setTranscoderPath('./vendor/basis/').setWorkerLimit(2).detectSupport(gl);
    const load = async () => {
      try {
        const path = workspaceAssets.assets[props.tier].path;
        const response = await fetch(path, { signal: controller.signal }); if (!response.ok) throw new Error('Room unavailable');
        const total = Number(response.headers.get('content-length')) || workspaceAssets.assets[props.tier].bytes;
        const reader = response.body?.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
        if (reader) { while (true) { const next = await reader.read(); if (next.done) break; chunks.push(next.value); bytes += next.value.byteLength; callbacks.current.onProgress(Math.min(.99, bytes / total)); } }
        const buffer = reader ? new Uint8Array(bytes) : new Uint8Array(await response.arrayBuffer());
        let offset = 0; for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
        const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx);
        const gltf = await loader.parseAsync(buffer.buffer, new URL('./model/', window.location.href).href);
        if (cancelled) { disposeRoom(gltf.scene); return; }
        owned = gltf.scene;
        const poster = await new Promise<THREE.Texture | null>(resolve => new THREE.TextureLoader().load('./img/zney-screen.svg', resolve, undefined, () => resolve(null)));
        if (cancelled) { poster?.dispose(); disposeRoom(owned); owned = null; return; }
        if (poster) { poster.flipY = true; poster.colorSpace = THREE.SRGBColorSpace; }
        owned.traverse(node => { if (!(node instanceof THREE.Mesh)) return; node.castShadow = props.tier === 'high'; node.receiveShadow = true;
          if (node.userData.workspaceItem === 'screen' && poster) {
            const material = new THREE.MeshStandardMaterial({ map: poster, emissiveMap: poster, emissive: '#dce4ff', emissiveIntensity: .25, roughness: .6, toneMapped: false });
            // Preserve disposal ownership of the replaced source material/maps.
            node.userData.replacedMaterials = node.material; node.material = material;
          }
        });
        setRoom(owned); callbacks.current.onProgress(1); callbacks.current.onReady(); invalidate();
      } catch (error) { if (!cancelled && !(error instanceof DOMException && error.name === 'AbortError')) callbacks.current.onError(); }
    }; void load();
    return () => { cancelled = true; controller.abort(); ktx.dispose(); if (owned) {
      owned.traverse(node => { if (node instanceof THREE.Mesh && node.userData.replacedMaterials) { const current = node.material; node.material = node.userData.replacedMaterials; delete node.userData.replacedMaterials; for (const material of Array.isArray(current) ? current : [current]) { if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose(); material.dispose(); } } });
      disposeRoom(owned);
    } };
  }, [props.tier, invalidate]);
  useFrame((_, delta) => {
    const now = performance.now();
    if (now-resourceAt.current > 1000) { resourceAt.current = now; gl.domElement.dataset.renderResources = JSON.stringify({ geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, tier: props.tier }); }
    if (previousPose.current.angleTo(camera.quaternion) > .0001 || props.locked || props.focusItem || props.paused) idleAt.current = now;
    previousPose.current.copy(camera.quaternion);
    if (props.paused || document.hidden || !room || now - warmAt.current < 3000) { goodAt.current = 0; frames.current = []; windowAt.current = now; return; }
    frames.current.push(delta * 1000);
    if (performance.now() - windowAt.current > 3000) {
      const samples = frames.current.sort((a, b) => a - b); const p95 = samples[Math.floor(samples.length * .95)] ?? 0;
      slowWindows.current = p95 > QUALITY[props.tier].frameBudget ? slowWindows.current + 1 : 0;
      if (slowWindows.current >= 2) { callbacks.current.onSlow(); slowWindows.current = 0; }
      if (p95 <= QUALITY[props.tier].frameBudget * .75) {
        goodAt.current ||= now;
        if (now - goodAt.current >= 30000 && now - idleAt.current >= 30000) { callbacks.current.onHealthy(); goodAt.current = now; }
      } else goodAt.current = 0;
      windowAt.current = performance.now(); frames.current = [];
      gl.domElement.dataset.renderStats = JSON.stringify({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, p95: Math.round(p95 * 10) / 10, samples: samples.length, tier: props.tier });
    }
  });
  if (!room) return null;
  return <><primitive object={room}/><SelectionOutline id={!props.paused ? props.focusItem ?? props.target : null}/><WorkspaceControls onMonitorSurface={props.onMonitorSurface} pose={props.pose} onReturnComplete={props.onReturnComplete} room={room} disabled={props.paused} focusItem={props.focusItem} locked={props.locked} tilt={props.tilt} onTarget={props.onTarget} onSelect={props.onSelect} onLock={props.onLock} onFocusComplete={props.onFocusComplete} recenter={props.recenter}/>
    {!props.paused && !props.locked && !props.focusItem && workspaceItems.filter(item => props.showLabels || props.target === item.id).map(item => <AnchorLabel key={item.id} {...item} onSelect={props.onSelect}/>)}</>;
}
function RendererLifecycle({ onError }: { onError: () => void }) {
  const { gl, camera, size } = useThree();
  useEffect(() => { const canvas = gl.domElement; canvas.addEventListener('webglcontextlost', onError); return () => canvas.removeEventListener('webglcontextlost', onError); }, [gl, onError]);
  useEffect(() => { const lens = camera as THREE.PerspectiveCamera; lens.fov = size.width < size.height ? 65 : 50; lens.updateProjectionMatrix(); }, [camera, size.width, size.height]);
  return null;
}
export function WorkspaceScene(props: Props) {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => { const change = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', change); return () => document.removeEventListener('visibilitychange', change); }, []);
  return <Canvas className={`room-canvas${props.locked ? ' is-locked' : ''}`} shadows={QUALITY[props.tier].shadows} dpr={[1, QUALITY[props.tier].dpr]}
    frameloop={!visible ? 'never' : props.paused || props.reduced ? 'demand' : 'always'} camera={{ position: [5, 10, .5], fov: 50, near: .1, far: 200 }}
    gl={{ antialias: false, powerPreference: props.tier === 'low' ? 'low-power' : 'high-performance' }} onCreated={({ gl }) => {
      gl.setClearColor('#050913'); gl.shadowMap.type = THREE.PCFShadowMap;
    }}>
    <ambientLight intensity={.8}/><directionalLight position={[15,25,15]} intensity={1.25} castShadow={QUALITY[props.tier].shadows} shadow-mapSize={[1024,1024]} shadow-bias={-.0001}/>
    <pointLight position={[-10,10,-10]} intensity={.55} color="#60a5fa"/><pointLight position={[10,5,-10]} intensity={.45} color="#8b5cf6"/>
    <RendererLifecycle onError={props.onError}/><Room {...props}/>
  </Canvas>;
}
