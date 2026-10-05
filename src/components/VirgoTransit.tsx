import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createRockGeometry } from "../data/virgoCelestial";
import { journeyCameraZ, TRANSIT_LEGS, transitPlanets, transitSample } from "../data/virgoTransit";
import { VirgoPlanet } from "./VirgoPlanet";

type TransitFlight = { position: number; time: number; reduced: boolean; mobile: boolean; speed: number; tier: 'low' | 'medium' | 'high' };
const random = (i: number) => {
  const n = Math.sin(i * 127.1 + 43.7) * 43758.5453;
  return n - Math.floor(n);
};

function Passage({ index, flight, glow }: { index: number; flight: TransitFlight; glow: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const rocks = useRef<THREE.InstancedMesh>(null);
  const dust = useRef<THREE.Points>(null);
  const opacity = useRef(0);
  const planets = useMemo(() => transitPlanets(index, flight.mobile).slice(0,flight.tier === 'low' ? 3 : flight.tier === 'medium' ? 4 : 6), [index, flight.mobile, flight.tier]);
  const rockGeometry = useMemo(() => createRockGeometry(index + 12), [index]);
  const count = flight.tier === 'low' ? 24 : flight.tier === 'medium' || flight.mobile ? 48 : 110;
  const positions = useMemo(() => {
    const leg = TRANSIT_LEGS[index];
    const from = journeyCameraZ(leg.from, flight.mobile), to = journeyCameraZ(leg.to, flight.mobile);
    return Array.from({ length: count }, (_, i) => ({
      position: [(random(i * 7 + index) > .5 ? -1 : 1) * (12 + random(i * 7 + 1) * 65) * (flight.mobile ? .45 : 1),
        (random(i * 7 + 2) - .5) * 80, from + (to - from) * random(i * 7 + 3)] as [number, number, number],
      scale: .35 + random(i * 7 + 4) * 1.1,
    }));
  }, [count, index, flight.mobile]);
  const dustGeometry = useMemo(() => new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions.flatMap(p => p.position), 3)), [positions]);
  useEffect(() => () => { rockGeometry.dispose(); dustGeometry.dispose(); }, [rockGeometry, dustGeometry]);
  useLayoutEffect(() => {
    if (!rocks.current) return;
    const object = new THREE.Object3D();
    positions.forEach((p, i) => {
      object.position.set(...p.position); object.rotation.set(i * .71, i * .23, i * .43);
      object.scale.set(p.scale * 1.35, p.scale, p.scale * .8); object.updateMatrix();
      rocks.current!.setMatrixAt(i, object.matrix);
      rocks.current!.setColorAt(i, new THREE.Color().setHSL(.09, .07, .28 + random(i + 122) * .22));
    });
    rocks.current.instanceMatrix.needsUpdate = true;
    rocks.current.computeBoundingSphere();
  }, [positions]);
  useFrame(() => {
    const passage = transitSample(flight.position);
    opacity.current = !flight.reduced && passage.index === index ? passage.envelope : 0;
    if (group.current) group.current.visible = opacity.current > .001;
    if (rocks.current) (rocks.current.material as THREE.MeshStandardMaterial).opacity = opacity.current;
    if (dust.current) (dust.current.material as THREE.PointsMaterial).opacity = opacity.current * .28;
  }, -.4);
  return <group ref={group} visible={false}>
    {planets.map((planet, i) => <group key={i} position={planet.position}>
      <VirgoPlanet index={planet.index} skills={false} radius={planet.radius} flight={flight}
        visibility={() => opacity.current} sunPosition={[0, 100, journeyCameraZ(TRANSIT_LEGS[index].from, flight.mobile) + 150]} />
    </group>)}
    <instancedMesh ref={rocks} args={[rockGeometry, undefined, count]}>
      <meshStandardMaterial color="#b8c2cb" vertexColors transparent roughness={1} />
    </instancedMesh>
    <points ref={dust} geometry={dustGeometry}>
      <pointsMaterial map={glow} size={.65} color="#aac5df" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  </group>;
}

export function VirgoTransit({ flight, glow }: { flight: TransitFlight; glow: THREE.Texture }) {
  const { camera } = useThree();
  const light = useRef<THREE.PointLight>(null);
  const lightOffset = useMemo(() => new THREE.Vector3(-35, 45, 55), []);
  useFrame(() => {
    if (!light.current) return;
    light.current.position.copy(camera.position).add(lightOffset);
    light.current.intensity = transitSample(flight.position).envelope * 2200;
  });
  return <group>
    <pointLight ref={light} color="#bdd6ee" distance={320} decay={1.5} />
    {TRANSIT_LEGS.map((_, index) => <Passage key={index} index={index} flight={flight} glow={glow} />)}
  </group>;
}
