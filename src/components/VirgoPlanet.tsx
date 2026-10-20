import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createPlanetMaps, createPlanetRing, planetType, PLANET_TYPES, type PlanetType } from "../data/virgoCelestial";
import { VIRGO_STARS } from "../data/virgoStations";
import { CELESTIAL_PROJECTS } from '../data/celestialRegistry';
import { projects } from '../data/portfolio';
import { Html } from '@react-three/drei/web/Html.js';
import { useState } from 'react';
import { playPortfolioSfx } from '../utils/portfolioAudio';

type PlanetFlight = { time: number; reduced: boolean; mobile: boolean };
type PlanetMaps = { surface: THREE.Texture; relief: THREE.Texture; clouds: THREE.Texture; observed?: boolean; cloudMask?: boolean };
const PlanetTextures = createContext<Record<PlanetType, PlanetMaps> | null>(null);
const PlanetInteraction = createContext<{ select?: (index: number, skills: boolean, section?: string) => void; hover?: (index: number | null, skills: boolean) => void }>({});

export function PlanetTextureLibrary({ mobile, children, select, hover }: { mobile: boolean; children: ReactNode; select?: (index: number, skills: boolean, section?: string) => void; hover?: (index: number | null, skills: boolean) => void }) {
  const maps = useMemo(() => Object.fromEntries(PLANET_TYPES.map((type, i) => [type, createPlanetMaps(type, i * 7, mobile)])) as Record<PlanetType, ReturnType<typeof createPlanetMaps>>, [mobile]);
  useEffect(() => () => Object.values(maps).forEach(set => Object.values(set).forEach(map => map.dispose())), [maps]);
  const [observed, setObserved] = useState<Record<string, THREE.Texture>>({});
  useEffect(() => {
    let active = true;
    const owned: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();
    setObserved({});
    for (const name of ['earth', 'jupiter', 'moon', 'mars', 'clouds']) {
      loader.load(`./img/celestial/${name}-${mobile ? 1024 : 2048}.webp`, texture => {
        if (!active) { texture.dispose(); return; }
        texture.colorSpace = name === 'clouds' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.anisotropy = mobile ? 2 : 4;
        owned.push(texture);
        setObserved(previous => ({ ...previous, [name]: texture }));
      }, undefined, () => { /* Procedural maps remain usable when a local asset is unavailable. */ });
    }
    return () => { active = false; owned.forEach(texture => texture.dispose()); };
  }, [mobile]);
  const library = useMemo(() => {
    const result: Record<PlanetType, PlanetMaps> = { ...maps };
    for (const type of PLANET_TYPES) {
      const source = { ocean: 'earth', gas: 'jupiter', crater: 'moon', rock: 'mars', ice: '', lava: '' }[type];
      result[type] = { ...maps[type], ...(observed[source] ? { surface: observed[source], observed: true } : {}),
        ...(type === 'ocean' && observed.clouds ? { clouds: observed.clouds, cloudMask: true } : {}) };
    }
    return result;
  }, [maps, observed]);
  return <PlanetInteraction.Provider value={{ select, hover }}><PlanetTextures.Provider value={library}>{children}</PlanetTextures.Provider></PlanetInteraction.Provider>;
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
    float facing = max(dot(n, normalize(cameraPosition - worldPosition)), 0.0);
    float rim = pow(1.0 - facing, 4.1);
    float solar = dot(n, normalize(sunPosition - worldPosition));
    float daylight = smoothstep(-0.22, 0.65, solar);
    float dusk = exp(-abs(solar + .04) * 12.0);
    vec3 scattering = mix(tint, vec3(.95,.52,.23), dusk * .48);
    gl_FragColor = vec4(scattering, rim * (.025 + daylight * .56 + dusk * .12) * appearance);
    #include <colorspace_fragment>
  }
`;

export function VirgoPlanet({ index, skills, radius, flight, visibility, sunPosition, origin = false }: { index: number; skills: boolean; radius: number; flight: PlanetFlight; visibility?: () => number; sunPosition?: [number, number, number]; origin?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const materials = useRef<THREE.Material[]>([]);
  const type = origin ? PLANET_TYPES[index % PLANET_TYPES.length] : planetType(index, skills);
  const entry = CELESTIAL_PROJECTS.find(item => item.id === projects[index]?.id);
  const hasRing = !skills && (origin ? type === 'gas' || type === 'ice' : entry && 'ring' in entry);
  const satellite = !skills && !hasRing && entry && 'satellite' in entry ? entry.satellite : undefined;
  const interaction = useContext(PlanetInteraction);
  const [stepVisible, setStepVisible] = useState(false);
  const body = useRef<THREE.Mesh>(null), cloud = useRef<THREE.Mesh>(null), moon = useRef<THREE.Mesh>(null), ringBody = useRef<THREE.Mesh>(null);
  const maps = useContext(PlanetTextures)![type];
  const ring = useMemo(() => hasRing ? createPlanetRing(radius) : null, [hasRing, radius]);
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
      materials.current.forEach(material => { material.opacity = alpha * (material.userData.baseOpacity ?? 1); });
    }
    if (body.current) body.current.rotation.y = index + (flight.reduced ? 0 : flight.time * Math.PI * 2 / (45 + index % 6 * 9));
    if (cloud.current) cloud.current.rotation.y = index + (flight.reduced ? 0 : flight.time * Math.PI * 2 / (38 + index * 3));
    if (ringBody.current) ringBody.current.rotation.z = flight.reduced ? 0 : flight.time * .018;
    if (moon.current) {
      const angle = index + (flight.reduced ? 0 : flight.time * Math.PI * 2 / (18 + index % 5 * 3));
      moon.current.position.set(Math.cos(angle) * radius * 2.8, Math.sin(angle) * radius * 2.8 * .35, Math.sin(angle) * radius * 2.8 * Math.sqrt(1 - .35 ** 2));
    }
  });
  return <group ref={group} rotation-z={(index % 3 - 1) * .28}>
    <mesh ref={body} onClick={event => { event.stopPropagation(); playPortfolioSfx('click'); if (origin) setStepVisible(value => !value); else interaction.select?.(index, skills); }} onPointerOver={event => { event.stopPropagation(); playPortfolioSfx('hover'); if (origin) setStepVisible(true); else interaction.hover?.(index, skills); }} onPointerOut={() => { if (origin) setStepVisible(false); else interaction.hover?.(null, skills); }}><sphereGeometry args={[radius, flight.mobile ? 28 : 48, flight.mobile ? 20 : 32]} />
      <meshStandardMaterial transparent={!!visibility} map={maps.surface} bumpMap={maps.observed ? type === 'crater' || type === 'rock' ? maps.surface : undefined : maps.relief} bumpScale={maps.observed ? radius * .014 : type === "gas" ? .006 : radius * .045} roughness={type === "ocean" ? .48 : type === 'ice' ? .58 : .9} metalness={0} emissive={type === "lava" ? "#ea4b16" : "#000000"} emissiveMap={type === "lava" ? maps.surface : undefined} emissiveIntensity={type === "lava" ? .23 : 0} />
    </mesh>
    {type === "ocean" && <mesh ref={cloud}><sphereGeometry args={[radius * 1.016, 32, 24]} /><meshStandardMaterial map={maps.cloudMask ? undefined : maps.clouds} alphaMap={maps.cloudMask ? maps.clouds : undefined} transparent opacity={.78} userData={{ baseOpacity: .78 }} depthWrite={false} roughness={1} /></mesh>}
    {(type === "ocean" || type === "gas" || type === "ice") && <mesh><sphereGeometry args={[radius * 1.04, 32, 24]} /><shaderMaterial uniforms={atmosphere} vertexShader={ATMOSPHERE_VERTEX} fragmentShader={ATMOSPHERE_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>}
    {ring && <mesh ref={ringBody} geometry={ring.geometry} rotation-x={Math.PI / 2 - (18 + index % 3 * 4) * Math.PI / 180}><meshStandardMaterial map={ring.map} transparent side={THREE.DoubleSide} depthWrite={false} roughness={1} /></mesh>}
    {satellite && !origin && <mesh ref={moon} onClick={event => { event.stopPropagation(); playPortfolioSfx('click'); interaction.select?.(index, false, satellite); }}><sphereGeometry args={[radius * .18, 16, 12]} /><meshStandardMaterial transparent={!!visibility} color="#a39e92" roughness={1} bumpMap={maps.relief} bumpScale={radius * .025} /></mesh>}
    {origin && stepVisible && <Html position={[0, radius + 2, 0]} center><span className="virgo-step-label">{['Need · Understand the problem', 'Build · Make a useful tool', 'Connect · Bring the parts together', 'Learn · Improve through practice'][index]}</span></Html>}
  </group>;
}
