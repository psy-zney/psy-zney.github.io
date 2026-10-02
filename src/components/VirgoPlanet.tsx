import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createPlanetMaps, createPlanetRing, planetType, PLANET_TYPES, type PlanetType } from "../data/virgoCelestial";
import { VIRGO_STARS } from "../data/virgoStations";

type PlanetFlight = { time: number; reduced: boolean; mobile: boolean };
const PlanetTextures = createContext<Record<PlanetType, ReturnType<typeof createPlanetMaps>> | null>(null);

export function PlanetTextureLibrary({ mobile, children }: { mobile: boolean; children: ReactNode }) {
  const maps = useMemo(() => Object.fromEntries(PLANET_TYPES.map((type, i) => [type, createPlanetMaps(type, i * 7, mobile)])) as Record<PlanetType, ReturnType<typeof createPlanetMaps>>, [mobile]);
  useEffect(() => () => Object.values(maps).forEach(set => Object.values(set).forEach(map => map.dispose())), [maps]);
  return <PlanetTextures.Provider value={maps}>{children}</PlanetTextures.Provider>;
}
const ATMOSPHERE_VERTEX = `
  varying vec3 worldNormal; varying vec3 worldPosition;
  void main() {
    worldNormal = normalize(mat3(modelMatrix) * normal);
    worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
  }
`;
const ATMOSPHERE_FRAGMENT = `
  uniform vec3 sunPosition; uniform vec3 tint; uniform float appearance;
  varying vec3 worldNormal; varying vec3 worldPosition;
  void main() {
    vec3 n = normalize(worldNormal);
    float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - worldPosition)), 0.0), 3.2);
    float daylight = smoothstep(-0.18, 0.8, dot(n, normalize(sunPosition - worldPosition)));
    gl_FragColor = vec4(tint, rim * (0.04 + daylight * 0.42) * appearance);
    #include <colorspace_fragment>
  }
`;

export function VirgoPlanet({ index, skills, radius, flight, visibility, sunPosition }: { index: number; skills: boolean; radius: number; flight: PlanetFlight; visibility?: () => number; sunPosition?: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  const materials = useRef<THREE.Material[]>([]);
  const type = planetType(index, skills);
  const body = useRef<THREE.Mesh>(null), cloud = useRef<THREE.Mesh>(null), moon = useRef<THREE.Mesh>(null);
  const maps = useContext(PlanetTextures)![type];
  const ring = useMemo(() => type === "gas" || (type === "ice" && !skills) ? createPlanetRing(radius) : null, [type, radius, skills]);
  const atmosphere = useMemo(() => ({
    sunPosition: { value: new THREE.Vector3(...(sunPosition ?? VIRGO_STARS[skills ? 2 : 1].position)) },
    appearance: { value: 1 },
    tint: { value: new THREE.Color(type === "gas" ? "#d5b57c" : "#679ed2") },
  }), [skills, type, sunPosition?.[0], sunPosition?.[1], sunPosition?.[2]]);
  useEffect(() => () => { ring?.geometry.dispose(); ring?.map.dispose(); }, [ring]);
  useEffect(() => {
    materials.current = [];
    group.current?.traverse(node => {
      if (node instanceof THREE.Mesh) materials.current.push(...(Array.isArray(node.material) ? node.material : [node.material]));
    });
  }, [maps, ring]);
  useFrame(() => {
    if (visibility) {
      const alpha = visibility();
      atmosphere.appearance.value = alpha;
      materials.current.forEach(material => { material.opacity = alpha; });
    }
    if (body.current) body.current.rotation.y = index + (flight.reduced ? 0 : flight.time * (.10 + index * .008));
    if (cloud.current) cloud.current.rotation.y = index + (flight.reduced ? 0 : flight.time * .14);
    if (moon.current) {
      const angle = index + (flight.reduced ? 0 : flight.time * .34);
      moon.current.position.set(Math.cos(angle) * radius * 3.5, Math.sin(angle) * radius * .85, Math.sin(angle) * radius * 2.7);
    }
  });
  return <group ref={group} rotation-z={(index % 3 - 1) * .28}>
    <mesh ref={body}><sphereGeometry args={[radius, flight.mobile ? 28 : 48, flight.mobile ? 20 : 32]} />
      <meshStandardMaterial transparent={!!visibility} map={maps.surface} bumpMap={maps.relief} bumpScale={type === "gas" ? .006 : radius * .075} roughness={type === "ocean" ? .45 : .92} metalness={0} emissive={type === "lava" ? "#ea4b16" : "#000000"} emissiveMap={type === "lava" ? maps.surface : undefined} emissiveIntensity={type === "lava" ? .23 : 0} />
    </mesh>
    {type === "ocean" && <mesh ref={cloud}><sphereGeometry args={[radius * 1.012, 32, 24]} /><meshStandardMaterial map={maps.clouds} transparent opacity={.85} depthWrite={false} roughness={1} /></mesh>}
    {(type === "ocean" || type === "gas" || type === "ice") && <mesh><sphereGeometry args={[radius * 1.04, 32, 24]} /><shaderMaterial uniforms={atmosphere} vertexShader={ATMOSPHERE_VERTEX} fragmentShader={ATMOSPHERE_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>}
    {ring && <mesh geometry={ring.geometry} rotation-x={1.12}><meshStandardMaterial map={ring.map} transparent side={THREE.DoubleSide} depthWrite={false} roughness={1} /></mesh>}
    {(type === "ocean" || type === "crater" || type === "gas") && <mesh ref={moon}><sphereGeometry args={[radius * .18, 16, 12]} /><meshStandardMaterial transparent={!!visibility} color="#a39e92" roughness={1} bumpMap={maps.relief} bumpScale={radius * .025} /></mesh>}
  </group>;
}
