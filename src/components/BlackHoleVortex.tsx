import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { smooth } from "../data/virgoFlight";
import { ACCRETION_VERTEX, DISPLAY_FRAGMENT } from "./blackHoleShader";
import type { BlackHoleOrbitState } from "./BlackHoleOrbitControls";
import { BlackHoleRenderPipeline } from './blackHoleRendering';

interface BlackHoleProps {
  flight: {
    contact: number;
    exit: number;
    time: number;
    reduced: boolean;
    mobile: boolean;
    position: number;
    tier?: 'low' | 'medium' | 'high';
  };
  glow: THREE.Texture;
  orbit: RefObject<BlackHoleOrbitState>;
}

function BlackHoleAccretionMesh({ flight, orbit }: Pick<BlackHoleProps, "flight" | "orbit">) {
  const mesh = useRef<THREE.Mesh>(null);
  const { invalidate, gl, size, camera } = useThree();
  const worldPosition = useMemo(() => new THREE.Vector3(), []);
  const worldScale = useMemo(() => new THREE.Vector3(), []);
  const rendered = useRef({ time: -Infinity, azimuth: NaN, elevation: NaN, exit: NaN, resolution: 0, rayResolution: 0, sampling: 0 });
  const cadence = useRef({ start: 0, frames: 0, slow: 0, fast: 0, scale: 1, recoveryAt: 0 });
  const uniforms = useMemo(() => ({
    uTime: { value: 4 },
    uPresence: { value: 0 },
    uExit: { value: 0 },
    uElevation: { value: .13 },
    uAzimuth: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uSampleResolution: { value: 1024 },
  }), []);
  const pipeline = useMemo(() => new BlackHoleRenderPipeline(uniforms), [uniforms]);
  const warmed = useRef(false);
  const prepared = useRef(false);
  const display = useMemo(() => ({
    uRadiance: { value: pipeline.radiance.texture },
    uBloomNear: { value: pipeline.bloom[0].output.texture },
    uBloomMedium: { value: pipeline.bloom[1].output.texture },
    uBloomWide: { value: pipeline.bloom[2].output.texture },
    uPresence: uniforms.uPresence,
  }), [pipeline, uniforms]);
  useEffect(() => { pipeline.retain(); return () => pipeline.dispose(); }, [pipeline]);
  useEffect(() => {
    let active = true;
    prepared.current = false;
    void pipeline.prepare(gl).then(() => {
      if (!active) return;
      prepared.current = true;
      invalidate();
    });
    return () => { active = false; };
  }, [gl, pipeline, invalidate]);
  useEffect(() => {
    const restore = () => { rendered.current.azimuth = NaN; pipeline.invalidatePaths(); invalidate(); };
    gl.domElement.addEventListener('webglcontextrestored', restore);
    return () => gl.domElement.removeEventListener('webglcontextrestored', restore);
  }, [gl, pipeline, invalidate]);

  useEffect(() => {
    const view = orbit.current;
    if (!view) return;
    view.invalidate = invalidate;
    return () => {
      if (view.invalidate === invalidate) view.invalidate = null;
    };
  }, [orbit, invalidate]);

  useFrame((_, delta) => {
    if (!mesh.current || gl.getContext().isContextLost()) return;
    if (!prepared.current) { mesh.current.visible = false; return; }
    // Compile the two GPU programs while Skills is being read, on a tiny
    // target. First contact with the hole must not stall the forward flight.
    if (!warmed.current && flight.position >= 4.8) {
      pipeline.render(gl, 256, 256);
      warmed.current = true;
    }
    const presence = flight.exit > 0 ? 1 : smooth(5.30, 5.40, flight.position);
    mesh.current.visible = presence > .005;
    if (!mesh.current.visible) return;
    uniforms.uTime.value = flight.reduced ? 4 : flight.time;
    uniforms.uPresence.value = presence * (1 - flight.exit * .5);
    uniforms.uExit.value = flight.exit;
    const target = orbit.current;
    if (target) {
      for (const [uniform, value] of [[uniforms.uElevation, target.elevation], [uniforms.uAzimuth, target.azimuth]] as const) {
        uniform.value = flight.reduced || Math.abs(uniform.value - value) < .0005
          ? value : THREE.MathUtils.damp(uniform.value, value, 12, Math.min(delta, .05));
      }
    }
    const tier = flight.tier ?? 'high';
    const viewMoving = !!target && (Math.abs(target.azimuth - uniforms.uAzimuth.value) > .0005
      || Math.abs(target.elevation - uniforms.uElevation.value) > .0005);
    const maximumResolution = tier === 'low' ? 640 : flight.mobile || size.height < 600 || tier === 'medium' ? 896 : 1280;
    mesh.current.updateWorldMatrix(true, false);
    mesh.current.getWorldPosition(worldPosition);
    mesh.current.getWorldScale(worldScale);
    const distance = camera.position.distanceTo(worldPosition);
    const projected = 190 * worldScale.x * size.height * gl.getPixelRatio()
      / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * Math.max(1, distance));
    const previous = rendered.current;
    const baseResolution = viewMoving && !flight.reduced ? Math.min(maximumResolution, 896)
      : Math.min(maximumResolution, projected < 720 ? 640 : projected < 1200 ? 960 : 1280);
    const targetResolution = Math.max(640, Math.round(baseResolution * cadence.current.scale / 64) * 64);
    const resolution = flight.exit > 0 && previous.resolution ? previous.resolution : targetResolution;
    // Keep rayResolution and shade resolution matched so NearestFilter encounter
    // textures never produce 2x2 derivative block artifacts.
    const rayResolution = resolution;
    const sampling = Math.max(32, Math.min(resolution, Math.round(projected / 16) * 16));
    uniforms.uSampleResolution.value = sampling;
    const viewChanged = Math.abs(previous.azimuth - uniforms.uAzimuth.value) > .0001
      || Math.abs(previous.elevation - uniforms.uElevation.value) > .0001;
    const paintTime = performance.now();
    if (!Number.isFinite(previous.azimuth) || viewChanged || previous.resolution !== resolution
      || previous.rayResolution !== rayResolution || previous.sampling !== sampling
      || !flight.reduced && paintTime - previous.time >= 1000 / (tier === 'high' ? 45 : 30)) {
      pipeline.render(gl, resolution, rayResolution);
      Object.assign(previous, { time: paintTime, azimuth: uniforms.uAzimuth.value, elevation: uniforms.uElevation.value, exit: flight.exit, resolution, rayResolution, sampling });
    }
    const root = gl.domElement.closest<HTMLElement>('.virgo-page');
    if (root) {
      root.dataset.blackHoleTraceCount = String(pipeline.stats.traces);
      root.dataset.blackHoleShadeCount = String(pipeline.stats.shades);
      root.dataset.blackHoleResolution = String(resolution);
      root.dataset.blackHoleRayResolution = String(rayResolution);
      root.dataset.blackHoleViewSettled = String(!viewMoving);
      root.dataset.blackHoleRenderAzimuth = uniforms.uAzimuth.value.toFixed(5);
      root.dataset.blackHoleRenderElevation = uniforms.uElevation.value.toFixed(5);
      const sample = cadence.current, now = performance.now();
      if (!sample.start) sample.start = now;
      sample.frames++;
      if (now - sample.start >= 1000) {
        const frameMs = (now - sample.start) / sample.frames;
        root.dataset.blackHoleFrameMs = frameMs.toFixed(2);
        if (!viewMoving && !flight.reduced) {
          sample.slow = frameMs > 36 ? sample.slow + 1 : 0;
          sample.fast = frameMs < 18 ? sample.fast + 1 : 0;
          if (sample.slow >= 2 && sample.scale > .75) {
            sample.scale = .75;
            sample.slow = 0; sample.recoveryAt = now + 15000;
          } else if (sample.fast >= 8 && sample.scale < 1 && now > sample.recoveryAt) {
            sample.scale = 1;
            sample.fast = 0; sample.recoveryAt = now + 15000;
          }
        }
        sample.start = now; sample.frames = 0;
      }
    }
  });

  return <mesh ref={mesh} position={[0, 0, -3.2]} renderOrder={2} userData={{ preserveOpacity: true }}>
    <planeGeometry args={[190, 190]} />
    <shaderMaterial vertexShader={ACCRETION_VERTEX} fragmentShader={DISPLAY_FRAGMENT}
      uniforms={display} transparent depthWrite={false} toneMapped={false} />
  </mesh>;
}

export function BlackHoleVortex({ flight, orbit }: BlackHoleProps) {
  // Gas, spiral trails and dust share the ray's intersection with one disk.
  return <group scale={flight.mobile ? .62 : .78} userData={{ preserveOpacity: true }}>
    <BlackHoleAccretionMesh flight={flight} orbit={orbit} />
  </group>;
}