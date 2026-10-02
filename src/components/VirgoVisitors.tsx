import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createRockGeometry } from "../data/virgoCelestial";

type VisitorFlight = { time: number; mobile: boolean; reduced: boolean };
const random = (i: number) => { const n = Math.sin(i * 127.1 + 31.7) * 43758.5453; return n - Math.floor(n); };

function Comet({ flight, glow, skills }: { flight: VisitorFlight; glow: THREE.Texture; skills: boolean }) {
  const head = useRef<THREE.Group>(null), tail = useRef<THREE.Group>(null);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const { nucleus, dust, ion } = useMemo(() => {
    const count = flight.mobile ? 70 : 170;
    const dust = new THREE.BufferGeometry(), ion = new THREE.BufferGeometry();
    const dp = new Float32Array(count * 3), ip = new Float32Array(count * 3);
    const dustColors = new Float32Array(count * 3), ionColors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const along = (i / count) ** 1.25 * 14, width = .05 + along * .05;
      dp.set([along, along * along * .012 + (random(i + 80) - .5) * width * 3, (random(i + 20) - .5) * width], i * 3);
      ip.set([along * 1.25, (random(i + 12) - .5) * width * .35, (random(i + 92) - .5) * width * .35], i * 3);
      const fade = (1 - i / count) ** 1.4;
      dustColors.set([fade, fade * .77, fade * .47], i * 3);
      ionColors.set([fade * .28, fade * .64, fade], i * 3);
    }
    dust.setAttribute("position", new THREE.BufferAttribute(dp, 3)); dust.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
    ion.setAttribute("position", new THREE.BufferAttribute(ip, 3)); ion.setAttribute("color", new THREE.BufferAttribute(ionColors, 3));
    return { nucleus: createRockGeometry(1), dust, ion };
  }, [flight.mobile]);
  useEffect(() => () => { nucleus.dispose(); dust.dispose(); ion.dispose(); }, [nucleus, dust, ion]);
  const axis = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  useFrame(() => {
    if (!head.current || !tail.current) return;
    const phase = (skills ? 2.8 : .8) + flight.time * .012;
    head.current.position.set(Math.cos(phase) * 48, Math.sin(phase) * 27, Math.sin(phase) * 12 - 8);
    head.current.rotation.y = flight.time * .17;
    tail.current.position.copy(head.current.position);
    // Both tails point away from the local sun; the wider dust tail curves.
    direction.copy(head.current.position).normalize();
    tail.current.quaternion.setFromUnitVectors(axis, direction);
  });
  return <>
    <group ref={head}>
      <mesh geometry={nucleus} scale={.48}><meshStandardMaterial color="#74695b" vertexColors roughness={1} /></mesh>
      <sprite scale={[2.4, 2.4, 1]}><spriteMaterial map={glow} color="#b2daf1" transparent opacity={.48} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    </group>
    <group ref={tail}>
      <points geometry={dust}><pointsMaterial map={glow} size={.75} vertexColors transparent opacity={.48} blending={THREE.AdditiveBlending} depthWrite={false} /></points>
      <points geometry={ion}><pointsMaterial map={glow} size={.34} vertexColors transparent opacity={.65} blending={THREE.AdditiveBlending} depthWrite={false} /></points>
    </group>
  </>;
}

function SpaceProbe({ flight, glow }: { flight: VisitorFlight; glow: THREE.Texture }) {
  const probe = useRef<THREE.Group>(null);
  const panelMap = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#182d4a"; ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = "#8aa4bf"; ctx.lineWidth = 1;
    for (let x = 0; x <= 128; x += 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 64); ctx.stroke(); }
    for (let y = 0; y <= 64; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => panelMap.dispose(), [panelMap]);
  useFrame(() => {
    if (!probe.current) return;
    const phase = -1.1 + flight.time * .012;
    probe.current.position.set(Math.cos(phase) * 44, Math.sin(phase) * 24, 6);
    probe.current.rotation.set(.35, -.45, phase + .25);
  });
  return <group ref={probe} scale={1.5}>
    <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[.45, .45, 1.5, 12]} /><meshStandardMaterial color="#b69855" roughness={.48} metalness={.7} /></mesh>
    <mesh><boxGeometry args={[.16, 5.4, .12]} /><meshStandardMaterial color="#8a939c" metalness={.7} roughness={.3} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[0, side * 2, 0]}><boxGeometry args={[2.4, 1.5, .045]} /><meshStandardMaterial map={panelMap} roughness={.4} metalness={.45} /></mesh>)}
    <mesh position={[.95, 0, 0]} rotation-z={-Math.PI / 2}><coneGeometry args={[.64, .24, 24, 1, true]} /><meshStandardMaterial color="#c9ced3" metalness={.8} roughness={.25} side={THREE.DoubleSide} /></mesh>
    <mesh position={[1.12, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[.028, .028, .5, 6]} /><meshStandardMaterial color="#c4c9cc" metalness={.7} /></mesh>
    <mesh position={[-.86, 0, 0]} rotation-z={Math.PI / 2}><coneGeometry args={[.25, .35, 12, 1, true]} /><meshStandardMaterial color="#57616b" metalness={.75} /></mesh>
    <sprite position={[-1, 0, 0]} scale={[.65, .45, 1]}><spriteMaterial map={glow} color="#6cc9ed" transparent opacity={.6} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
  </group>;
}

export function CelestialVisitors({ flight, glow, skills }: { flight: VisitorFlight; glow: THREE.Texture; skills: boolean }) {
  return <><Comet flight={flight} glow={glow} skills={skills} />{!skills && !flight.mobile && <SpaceProbe flight={flight} glow={glow} />}</>;
}
