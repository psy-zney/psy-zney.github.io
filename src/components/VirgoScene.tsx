import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import * as THREE from "three";
import { VIRGO_STARS, VIRGO_SUPPORT_STARS } from "../data/virgoStations";
import { capabilities, projects } from "../data/portfolio";
import { clamp, flightFieldOfView, flightPositionForScroll, flightSample, focusedStarForPosition, FLIGHT_MOTION, orbitPosition, panelVisibility, smooth, type FlightSample } from "../data/virgoFlight";
import { journeyCameraZ, systemPresence, transitSample, TRANSIT_LEGS } from "../data/virgoTransit";
import { VirgoTransit } from "./VirgoTransit";
import { advancePacedFlightPosition } from "../data/virgoPacing";
import { asteroidLayout, ORBIT_PLANE, orbitRadii, planetRadius, SPACE_LAYOUT } from "../data/virgoSpace";
import { mobileNarrativeTop, narrativeSample, narrativeTextReveal, NARRATIVE_BEATS } from "../data/virgoNarrative";
import { openingPresentation, openingStarAppearance, openingTransition, protectOpeningHandoff } from "../data/virgoOpening";
import { VirgoFractureAudio } from "../data/virgoFractureMedia";
import { spaceRiftFrame } from "../data/virgoSpaceRift";
import { VirgoSpaceRiftRenderer } from "./virgoSpaceRiftRenderer";
import { VirgoOpening } from "./VirgoOpening";
import { createRockGeometry } from "../data/virgoCelestial";
import { PlanetTextureLibrary, VirgoPlanet } from "./VirgoPlanet";
import { CelestialVisitors } from "./VirgoVisitors";

export { VIRGO_STARS, VIRGO_SUPPORT_STARS } from "../data/virgoStations";

export const CAMERA_STOPS = [
  new THREE.Vector3(0, 0, 500), new THREE.Vector3(0, 0, 240),
  ...VIRGO_STARS.map(star => new THREE.Vector3(0, 0, star.position[2] + SPACE_LAYOUT.desktopCamera.distance)),
];

type Flight = FlightSample & { speed: number; exit: number; time: number; reduced: boolean; mobile: boolean };
type FlightProps = { flight: Flight; glow: THREE.Texture };
const random = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453;
  return n - Math.floor(n);
};
const starFocus = (flight: Flight, index: number) => index === 0 ? flight.origin : index === 1 ? flight.projects : index === 2 ? flight.skills : flight.contact;
const starPresence = (flight: Flight, index: number) => flight.reduced ? Number(focusedStarForPosition(flight.position, true) === index) : systemPresence(index, flight.position);
const systemAppearance = (flight: Flight, kind: "origin" | "projects" | "skills") => Math.max(flight[kind], smooth(kind === "origin" ? 1.3 : kind === "projects" ? 2.3 : 4.3, kind === "origin" ? 1.9 : kind === "projects" ? 2.86 : 4.86, flight.position));
const STAR_VERTEX = `
  varying vec2 surfaceUv;
  varying vec3 surfaceNormal;
  varying vec3 viewDirection;
  void main() {
    surfaceUv = uv;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    surfaceNormal = normalMatrix * normal;
    viewDirection = -view.xyz;
    gl_Position = projectionMatrix * view;
  }
`;
const STAR_FRAGMENT = `
  uniform sampler2D surface;
  uniform float stellarTime;
  uniform float presence;
  varying vec2 surfaceUv;
  varying vec3 surfaceNormal;
  varying vec3 viewDirection;
  void main() {
    float facing = max(dot(normalize(surfaceNormal), normalize(viewDirection)), 0.0);
    float limb = 0.30 + 0.70 * pow(facing, 0.42);
    vec2 flowing = surfaceUv + vec2(stellarTime * .0018, sin(surfaceUv.x * 24.0 + stellarTime * .16) * .002);
    vec3 granules = texture2D(surface, flowing).rgb;
    float cells = texture2D(surface, flowing * vec2(3.0, 2.0)).r;
    float spots = smoothstep(.24, .41, cells);
    float convection = .94 + .06 * sin(surfaceUv.y * 110.0 + cells * 8.0 + stellarTime * .7);
    gl_FragColor = vec4(granules * limb * mix(.46, 1.18, spots) * convection, presence);
    #include <colorspace_fragment>
  }
`;

function useSurfaceTexture(color: string, seed: number, star = false) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 256;
    const context = canvas.getContext("2d")!;
    const pixels = context.createImageData(512, 256);
    const base = new THREE.Color(color);
    const grids = [16, 32, 64, 128].map((width, layer) => ({ width, height: width / 2, values: Float32Array.from({ length: width * width / 2 }, (_, i) => random(i + seed * 173 + layer * 937)) }));
    const noiseAt = (x: number, y: number) => {
      let value = 0;
      grids.forEach((grid, layer) => {
        const gx = x / 512 * grid.width, gy = y / 256 * grid.height;
        const ix = Math.floor(gx), iy = Math.floor(gy);
        const tx = smooth(0, 1, gx - ix), ty = smooth(0, 1, gy - iy);
        const sample = (dx: number, dy: number) => grid.values[((iy + dy) % grid.height) * grid.width + (ix + dx) % grid.width];
        const top = sample(0, 0) * (1 - tx) + sample(1, 0) * tx;
        const bottom = sample(0, 1) * (1 - tx) + sample(1, 1) * tx;
        value += (top * (1 - ty) + bottom * ty) * [.54, .26, .13, .07][layer];
      });
      return value * 2 - 1;
    };
    for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
      const noise = noiseAt(x, y);
      const detail = random(x + y * 512 + seed * 641) - .5;
      const band = Math.sin(y * .25 + noise * 1.6 + seed);
      const light = star ? .8 + noise * .5 + detail * .16 : .7 + (seed % 3 === 1 ? band : noise) * .55 + detail * .07;
      const offset = (y * 512 + x) * 4;
      pixels.data[offset] = Math.min(255, base.r * 255 * light + (star ? 48 : 12));
      pixels.data[offset + 1] = Math.min(255, base.g * 255 * light + (star ? 40 : 8));
      pixels.data[offset + 2] = Math.min(255, base.b * 255 * light + (star ? 32 : 4));
      pixels.data[offset + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    return result;
  }, [color, seed, star]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useGlowTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(.08, "rgba(255,255,255,.82)");
    gradient.addColorStop(.28, "rgba(255,255,255,.24)");
    gradient.addColorStop(.65, "rgba(255,255,255,.035)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Starfield({ flight, glow }: FlightProps) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const layers = useMemo(() => [0, 1, 2].map(layer => {
    const count = flight.mobile ? 280 : 520;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const seed = i + layer * 1700;
      positions[i * 3] = (random(seed * 3 + 1) - .5) * (1000 + layer * 400);
      positions[i * 3 + 1] = (random(seed * 3 + 2) - .5) * 900;
      positions[i * 3 + 2] = -60 - layer * 260 - random(seed * 3 + 3) * 300;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }), [flight.mobile]);
  useEffect(() => () => layers.forEach(layer => layer.dispose()), [layers]);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.z = camera.position.z;
    const blend = smooth(.82, 1.16, flight.position);
    group.current.visible = blend > .001;
    group.current.children.forEach((child, i) => { ((child as THREE.Points).material as THREE.PointsMaterial).opacity = blend * (.85 - i * .12); });
  });
  return <group ref={group}>{layers.map((geometry, i) => <points key={i} geometry={geometry} frustumCulled={false}>
    <pointsMaterial map={glow} color={["#dbeaff", "#9db7e4", "#f7d5c0"][i]} size={i === 0 ? 2.4 : 1.8} transparent opacity={.85 - i * .12} blending={THREE.AdditiveBlending} depthWrite={false} />
  </points>)}</group>;
}

function Nebula({ flight, glow }: FlightProps) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.z = camera.position.z;
    group.current.visible = flight.position > .82;
    group.current.rotation.z = flight.reduced ? 0 : flight.position * .025 + flight.time * .006;
    group.current.children.forEach((child, i) => {
      const sprite = child as THREE.Sprite;
      (sprite.material as THREE.SpriteMaterial).opacity = (.075 + i * .012) * smooth(.82, 1.16, flight.position);
    });
  });
  return <group ref={group} scale={SPACE_LAYOUT.interstellar}>
    <sprite position={[-11, 5, -10]} scale={[35, 18, 1]}><spriteMaterial map={glow} color="#476fbc" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    <sprite position={[9, 2, -15]} scale={[32, 26, 1]}><spriteMaterial map={glow} color="#7367ac" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    <sprite position={[1, -10, -8]} scale={[28, 13, 1]}><spriteMaterial map={glow} color="#3b9caa" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
  </group>;
}

function VirgoNode({ index, flight, glow, support = false }: FlightProps & { index: number; support?: boolean }) {
  const star = support ? VIRGO_SUPPORT_STARS[index] : VIRGO_STARS[index];
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const radius = support ? 1.13 : VIRGO_STARS[index].radius;
  const surface = useSurfaceTexture(star.color, index, true);
  const uniforms = useMemo(() => ({ surface: { value: surface }, stellarTime: { value: 0 }, presence: { value: 1 } }), [surface]);
  useFrame(() => {
    if (!group.current) return;
    uniforms.stellarTime.value = flight.time;
    const presence = support ? 1 : starPresence(flight, index);
    uniforms.presence.value = presence;
    const appearance = openingStarAppearance(support ? index + 4 : index, flight.reveal);
    const focus = support ? 0 : starFocus(flight, index);
    const scatter = flight.reduced ? 0 : 1 - appearance;
    group.current.position.set(star.position[0] * (1 + scatter * .3), star.position[1] * (1 + scatter * .3), star.position[2] - scatter * (3 + index % 3) * SPACE_LAYOUT.interstellar);
    group.current.visible = openingPresentation(flight.position).journey && appearance > .001;
    const sprite = group.current.children[0] as THREE.Sprite;
    const pulse = flight.reduced ? 0 : Math.sin(flight.time * (support ? 1.4 : 2) + index) * (support ? .045 : .08);
    const distance = camera.position.distanceTo(group.current.position);
    sprite.scale.setScalar((support ? 7 + Math.min(28, distance * .04) : radius * (5.2 + focus * .35 + pulse * .2)) * appearance);
    (sprite.material as THREE.SpriteMaterial).opacity = appearance * presence * (support ? .42 : .68 + focus * .26);
    group.current.children[1].scale.setScalar(appearance);
    group.current.children[1].rotation.y = flight.time * .055;
    for (let i = 2; i < group.current.children.length; i++) {
      const ring = group.current.children[i] as THREE.Mesh;
      ring.quaternion.copy(camera.quaternion);
      const phase = ((flight.position * 1.8 + flight.time * .42 + (i - 2) * .5) % 1 + 1) % 1;
      ring.scale.setScalar(1.05 + phase * .4);
      (ring.material as THREE.MeshBasicMaterial).opacity = flight.reduced ? 0 : focus * appearance * (1 - phase) * .07;
    }
  });
  return <group ref={group} position={star.position}>
    <sprite><spriteMaterial map={glow} color={star.color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    <mesh><sphereGeometry args={[radius, support ? 16 : 48, support ? 12 : 32]} /><shaderMaterial uniforms={uniforms} vertexShader={STAR_VERTEX} fragmentShader={STAR_FRAGMENT} transparent toneMapped={false} /></mesh>
    {!support && [0, 1].map(i => <mesh key={i}><ringGeometry args={[radius * 1.06, radius * 1.06 + .025, 80]} /><meshBasicMaterial color={star.color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>)}
  </group>;
}

function FlightTrails({ flight }: { flight: Flight }) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.LineBasicMaterial>(null);
  const { geometry, particles } = useMemo(() => {
    const count = flight.mobile ? 60 : 150;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 6), 3).setUsage(THREE.DynamicDrawUsage));
    const particles = Array.from({ length: count }, (_, i) => {
      const angle = random(i + 200) * Math.PI * 2;
      const radius = .34 + random(i + 60) * .56;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, phase: random(i + 50), length: 1 + random(i + 70) * 2.5 };
    });
    return { geometry, particles };
  }, [flight.mobile]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (!group.current || !material.current) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    const power = flight.reduced || !openingPresentation(flight.position).journey ? 0 : clamp(flight.thrust * .48 + flight.speed * .8 + flight.exit);
    group.current.visible = power > .005;
    if (!group.current.visible) return;
    material.current.opacity = power * .48;
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < positions.count / 2; i++) {
      const particle = particles[i];
      const z = 3 + ((particle.phase + flight.position * .9 + flight.time * (.12 + power * .35) + flight.exit * 2) % 1) * 15;
      const length = .06 + power * particle.length;
      positions.setXYZ(i * 2, particle.x * z, particle.y * z, -z);
      positions.setXYZ(i * 2 + 1, particle.x * (z + length), particle.y * (z + length), -z - length);
    }
    positions.needsUpdate = true;
  });
  return <group ref={group}><lineSegments geometry={geometry} frustumCulled={false}><lineBasicMaterial ref={material} color="#b7d7ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></lineSegments></group>;
}

function ForegroundDebris({ flight }: { flight: Flight }) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => createRockGeometry(2), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    group.current.visible = !flight.reduced && flight.leg > 0 && flight.speed > .16;
    if (!group.current.visible) return;
    group.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const phase = (flight.travel * 2 + i * .31) % 1;
      const z = -42 + phase * 22;
      mesh.position.set((i % 2 ? -1 : 1) * (14 + random(i + 19) * 4), (random(i + 21) - .5) * 19, z);
      mesh.rotation.set(flight.position * .4 + i, flight.position * .6, i * .5);
      (mesh.material as THREE.MeshStandardMaterial).opacity = flight.speed * .6 * smooth(0, .15, phase) * (1 - smooth(.75, 1, phase));
    });
  });
  return <group ref={group}>{Array.from({ length: flight.mobile ? 2 : 4 }, (_, i) => <mesh key={i} geometry={geometry} scale={.18 + random(i + 12) * .25}>
    <meshStandardMaterial color="#918778" vertexColors transparent opacity={0} roughness={1} depthWrite={false} />
  </mesh>)}</group>;
}

function OriginForge({ flight, glow }: FlightProps) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.visible = systemAppearance(flight, "origin") > .005;
    group.current.scale.setScalar(flight.mobile ? .72 : 1.06);
  });
  return <group ref={group} position={VIRGO_STARS[0].position}>
    {orbitRadii(false, flight.mobile).map((radius, index) => <OrbitRing key={radius} radius={radius} index={index} flight={flight} skills={false} origin />)}
    {Array.from({ length: 4 }, (_, index) => <OrbitingPlanet key={index} index={index} count={4} flight={flight} glow={glow} skills={false} selected={null} origin />)}
    <SystemDust flight={flight} glow={glow} kind="origin" />
  </group>;
}

function SystemDust({ flight, glow, kind }: FlightProps & { kind: "origin" | "projects" | "skills" }) {
  const { geometry, particles } = useMemo(() => {
    const count = flight.mobile ? 100 : 220;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const particles = Array.from({ length: count }, (_, i) => {
      const angle = random(i + 90) * Math.PI * 2;
      const radius = 7 + random(i + 24) * (kind === "projects" ? 29 : 18);
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: (random(i + 32) - .5) * 8 };
    });
    return { geometry, particles };
  }, [flight.mobile, kind]);
  const points = useRef<THREE.Points>(null);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (!points.current) return;
    const opacity = systemAppearance(flight, kind);
    points.current.visible = opacity > .005;
    if (!points.current.visible) return;
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    const gathering = flight.reduced ? 1 : smooth(kind === "origin" ? 1.25 : kind === "projects" ? 2.35 : 4.35, kind === "origin" ? 1.85 : kind === "projects" ? 2.85 : 4.85, flight.position);
    const spread = 1 + (1 - gathering) * 2;
    const angle = flight.position * .42 + (flight.reduced ? 0 : flight.time * .09);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let i = 0; i < positions.count; i++) {
      const particle = particles[i];
      positions.setXYZ(i, (particle.x * cos - particle.y * sin) * spread, (particle.y * cos + particle.x * sin) * .58 * spread, particle.z * spread);
    }
    positions.needsUpdate = true;
    (points.current.material as THREE.PointsMaterial).opacity = opacity * .4;
  });
  return <points ref={points} geometry={geometry} frustumCulled={false}><pointsMaterial map={glow} color={kind === "projects" ? "#ebcfa2" : "#a8c5ed"} size={.34} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></points>;
}

function OrbitRing({ radius, index, flight, skills, origin = false }: { radius: number; index: number; flight: Flight; skills: boolean; origin?: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ring.current) return;
    const visible = systemAppearance(flight, origin ? "origin" : skills ? "skills" : "projects");
    const build = flight.reduced ? 1 : smooth((origin ? 1.25 : skills ? 4.24 : 2.24) + index * .08, (origin ? 1.80 : skills ? 4.8 : 2.8) + index * .03, flight.position);
    // Reveal the guide with alpha; scaling or translating it would separate
    // the displayed path from the orbit followed by its planets.
    ring.current.scale.set(1, Math.hypot(ORBIT_PLANE.vertical, ORBIT_PLANE.depth), 1);
    ring.current.position.set(0, 0, 0);
    ring.current.rotation.set(Math.atan2(ORBIT_PLANE.depth, ORBIT_PLANE.vertical), 0, 0);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = visible * build * (.30 - index * .035);
  });
  return <mesh ref={ring}><torusGeometry args={[radius, .03, 6, 160]} /><meshBasicMaterial color={skills ? "#a8baff" : "#e5c18d"} transparent opacity={0} depthWrite={false} toneMapped={false} /></mesh>;
}

function OrbitingPlanet({ index, count, flight, glow, skills, selected, origin = false }: FlightProps & { index: number; count: number; skills: boolean; selected: number | null; origin?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const color = skills ? ["#9fcaff", "#b2a4e9", "#9fdbc6", "#e3c698", "#d5afd0"][index] : projects[index].color;
  const radius = planetRadius(index, skills);
  useFrame(() => {
    if (!group.current) return;
    const appearance = systemAppearance(flight, origin ? "origin" : skills ? "skills" : "projects") * (flight.reduced ? 1 : smooth((origin ? 1.25 : skills ? 4.25 : 2.25) + index * .027, (origin ? 1.83 : skills ? 4.83 : 2.83) + index * .008, flight.position));
    group.current.visible = appearance > .005;
    if (!group.current.visible) return;
    const position = orbitPosition(index, count, flight.reduced ? (skills ? 5 : 3) : flight.position, skills, 1, flight.time, flight.mobile);
    group.current.position.set(position[0], position[1], position[2]);
    const highlighted = selected === index;
    group.current.scale.setScalar(Math.max(.001, appearance) * (highlighted ? 1.28 : 1));
    if (halo.current) {
      halo.current.scale.setScalar(radius * 4.2);
      (halo.current.material as THREE.SpriteMaterial).opacity = appearance * (highlighted ? .22 : .035);
    }
  });
  return <group ref={group}>
    <sprite ref={halo}><spriteMaterial map={glow} color={color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    <VirgoPlanet index={index} skills={skills} radius={radius} flight={flight} sunPosition={[...VIRGO_STARS[origin ? 0 : skills ? 2 : 1].position]} />
  </group>;
}

function SkillConnections({ flight, selected }: { flight: Flight; selected: number | null }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.LineBasicMaterial>(null);
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(capabilities.length * 6), 3));
    return geometry;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (!group.current || !material.current) return;
    group.current.visible = flight.skills > .005;
    if (!group.current.visible) return;
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    capabilities.forEach((_, i) => {
      const point = orbitPosition(i, capabilities.length, flight.reduced ? 5 : flight.position, true, 1, flight.time, flight.mobile);
      positions.setXYZ(i * 2, 0, 0, 0);
      positions.setXYZ(i * 2 + 1, point[0], point[1], point[2]);
      const dot = group.current!.children[i + 1] as THREE.Mesh;
      const phase = flight.reduced ? .65 : (flight.position * 2 + flight.time * .5 + i * .17) % 1;
      dot.position.set(point[0] * phase, point[1] * phase, point[2] * phase);
      dot.scale.setScalar(selected === i ? 1.8 : 1);
      (dot.material as THREE.MeshBasicMaterial).opacity = flight.skills * (selected === i ? .95 : .45) * (flight.reduced ? 1 : smooth(0, .12, phase) * (1 - smooth(.85, 1, phase)));
    });
    positions.needsUpdate = true;
    material.current.opacity = flight.skills * .35;
  });
  return <group ref={group}>
    <lineSegments geometry={geometry} frustumCulled={false}><lineBasicMaterial ref={material} color="#a5c4fa" transparent opacity={0} depthWrite={false} /></lineSegments>
    {capabilities.map(item => <mesh key={item.id}><sphereGeometry args={[.24, 12, 8]} /><meshBasicMaterial color="#d2e4ff" transparent opacity={0} toneMapped={false} depthWrite={false} /></mesh>)}
  </group>;
}

function AsteroidBelt({ flight, skills }: { flight: Flight; skills: boolean }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const rocks = useMemo(() => asteroidLayout(flight.mobile ? 140 : 360), [flight.mobile]);
  const transform = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => createRockGeometry(1), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    mesh.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    rocks.forEach((rock, i) => {
      transform.position.set(...rock.position as [number, number, number]);
      transform.rotation.set(...rock.rotation as [number, number, number]);
      transform.scale.set(rock.scale * 1.6, rock.scale, rock.scale * .8);
      transform.updateMatrix();
      mesh.current!.setMatrixAt(i, transform.matrix);
      mesh.current!.setColorAt(i, new THREE.Color().setHSL(.08 + random(i + 519) * .07, .06 + random(i + 32) * .1, .36 + random(i + 203) * .28));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.boundingSphere = new THREE.Sphere(new THREE.Vector3(), SPACE_LAYOUT.asteroidOuter + 2);
  }, [rocks, transform]);
  useFrame(() => {
    if (!group.current) return;
    const appearance = systemAppearance(flight, skills ? "skills" : "projects");
    group.current.visible = appearance > .005;
    group.current.scale.setScalar(Math.max(.001, appearance));
    if (!group.current.visible || !mesh.current) return;
    // Advance rocks along the same inclined plane as the orbital guides.
    // Rotating the whole group around Y would tip the belt across the star.
    rocks.forEach((rock, i) => {
      const angle = rock.angle + (flight.reduced ? 0 : flight.time * .035);
      transform.position.set(Math.cos(angle) * rock.radius, Math.sin(angle) * rock.radius * ORBIT_PLANE.vertical, Math.sin(angle) * rock.radius * ORBIT_PLANE.depth + rock.height);
      transform.rotation.set(rock.rotation[0], rock.rotation[1] + flight.time * .08, rock.rotation[2]);
      transform.scale.set(rock.scale * 1.6, rock.scale, rock.scale * .8);
      transform.updateMatrix();
      mesh.current!.setMatrixAt(i, transform.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <group ref={group}>
    <instancedMesh ref={mesh} args={[geometry, undefined, rocks.length]}>
      <meshStandardMaterial color={skills ? "#c8c9d5" : "#d5c7af"} vertexColors roughness={1} metalness={.02} />
    </instancedMesh>
  </group>;
}

function SatelliteCluster({ kind, flight, glow, selected }: FlightProps & { kind: "projects" | "skills"; selected: number | null }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Sprite>(null);
  const skills = kind === "skills";
  const entries = skills ? capabilities : projects;
  useFrame(() => {
    if (!group.current || !core.current) return;
    const appearance = systemAppearance(flight, kind);
    group.current.visible = appearance > .005;
    group.current.scale.setScalar(flight.mobile ? .72 : 1.06);
    group.current.rotation.y = skills || flight.reduced ? 0 : flight.outer * .52;
    const pulse = flight.reduced ? 1 : 1 + Math.sin(flight.time * 1.5) * .055;
    core.current.scale.setScalar(22 * pulse);
    (core.current.material as THREE.SpriteMaterial).opacity = appearance * .22;
  });
  return <group ref={group} position={VIRGO_STARS[skills ? 2 : 1].position}>
    <sprite ref={core} scale={[2.4, 2.4, 1]}><spriteMaterial map={glow} color={skills ? "#b1b6ed" : "#f5cd85"} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    {orbitRadii(skills, flight.mobile).map((radius, i) => <OrbitRing key={radius} radius={radius} index={i} flight={flight} skills={skills} />)}
    <AsteroidBelt flight={flight} skills={skills} />
    {entries.map((entry, index) => <OrbitingPlanet key={entry.id} index={index} count={entries.length} flight={flight} glow={glow} skills={skills} selected={selected} />)}
    <SystemDust flight={flight} glow={glow} kind={kind} />
    <CelestialVisitors flight={flight} glow={glow} skills={skills} />
    {skills && <SkillConnections flight={flight} selected={selected} />}
  </group>;
}


function PortalGate({ flight, glow, gate }: FlightProps & { gate: THREE.Vector3 }) {
  const anchor = useRef<THREE.Group>(null);
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (!anchor.current || !group.current || !halo.current) return;
    anchor.current.position.copy(gate);
    anchor.current.quaternion.copy(camera.quaternion);
    group.current.visible = flight.contact > .005 || flight.exit > 0;
    group.current.scale.setScalar((flight.mobile ? .68 : 1) * (.7 + flight.contact * .3 + flight.exit * .5));
    group.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      mesh.rotation.z = (flight.reduced ? 0 : flight.position * (i % 2 ? -.5 : .5) + flight.time * (i % 2 ? -.35 : .35) + flight.exit * 2) + i;
      (mesh.material as THREE.MeshBasicMaterial).opacity = flight.contact * (.50 - i * .06) * (1 - flight.exit * .5);
    });
    halo.current.scale.setScalar(40 + flight.exit * 120);
    (halo.current.material as THREE.SpriteMaterial).opacity = flight.contact * (.16 + flight.exit * .55);
  });
  return <group ref={anchor}>
    <sprite ref={halo}><spriteMaterial map={glow} color="#adcfff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    <group ref={group}>{[0, 1, 2].map(i => <mesh key={i} position-z={i * 1.8}>
      <torusGeometry args={[6.6 + i * 2.8, .065 + i * .02, 8, 120, i === 1 ? Math.PI * 1.55 : Math.PI * 2]} /><meshBasicMaterial color={i === 1 ? "#f1d6c6" : "#98c9f6"} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>)}</group>
  </group>;
}

function FocusedSystem({ index, flight, children }: { index: number | null; flight: Flight; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const materials = useRef<{ material: THREE.Material; opacity: number }[]>([]);
  useLayoutEffect(() => {
    materials.current = [];
    const seen = new Set<THREE.Material>();
    group.current?.traverse(node => {
      if (!(node instanceof THREE.Mesh || node instanceof THREE.Sprite || node instanceof THREE.Points || node instanceof THREE.Line)) return;
      const list = Array.isArray(node.material) ? node.material : [node.material];
      list.forEach(material => {
        if (seen.has(material)) return;
        seen.add(material);
        materials.current.push({ material, opacity: material.opacity });
        if (!material.transparent) { material.transparent = true; material.needsUpdate = true; }
      });
    });
  }, [flight.mobile]);
  // Restore the unattenuated alpha before child animations update it. Static
  // comet/probe materials must not compound the previous frame's fade.
  useFrame(() => {
    materials.current.forEach(({ material, opacity }) => { material.opacity = opacity; });
  }, -.2);
  useFrame(() => {
    const presence = index === null ? 0 : starPresence(flight, index);
    if (group.current) group.current.visible = openingPresentation(flight.position).journey && presence > .001;
    if (presence <= .001) return;
    materials.current.forEach(entry => {
      const { material } = entry;
      entry.opacity = material.opacity;
      if (!(material instanceof THREE.ShaderMaterial)) material.opacity *= presence;
      if (material instanceof THREE.ShaderMaterial && material.uniforms.appearance) material.uniforms.appearance.value = presence;
    });
  });
  return <group ref={group}>{children}</group>;
}

export function createCameraComposition(mobile = false) {
  const targets = [new THREE.Vector3(), new THREE.Vector3(), ...VIRGO_STARS.slice(0, 2).map(star => new THREE.Vector3(...star.position)), new THREE.Vector3(...VIRGO_STARS[1].position), ...VIRGO_STARS.slice(2).map(star => new THREE.Vector3(...star.position))];
  const direction = new THREE.Vector3(0, 0, -200);
  // A single heading and projection shift keep every stellar disk circular.
  const framing = [new THREE.Vector2(), new THREE.Vector2(), ...[-.38, .38, .38, -.38, -.38].map(x => new THREE.Vector2(mobile ? 0 : x, mobile ? .40 : 0))];
  return { targets, framing, direction };
}

interface SceneProps {
  scroller: HTMLElement;
  content: HTMLElement;
  overlay: HTMLElement;
  onChapter: (index: number) => void;
  reducedMotion: boolean;
  selectedProject: number | null;
  selectedSkill: number | null;
  portalRef: RefObject<HTMLButtonElement>;
  labelsRef: RefObject<HTMLDivElement>;
  entering: boolean;
  paused: boolean;
}

export function createFlightPaths(mobile = false) {
  return Array.from({ length: 6 }, (_, leg) => {
    class Corridor extends THREE.Curve<THREE.Vector3> {
      constructor() { super(); }
      getPoint(t: number, result = new THREE.Vector3()) { return result.set(0, 0, journeyCameraZ(leg + t, mobile)); }
      getPointAt(t: number, result = new THREE.Vector3()) { return this.getPoint(t, result); }
    }
    return new Corridor();
  });
}

function CameraFlight({ scroller, content, overlay, onChapter, reducedMotion, selectedProject, selectedSkill, portalRef, labelsRef, entering, paused }: SceneProps) {
  const { camera, size, invalidate } = useThree();
  const mobile = size.width < 700;
  const flight = useMemo<Flight>(() => ({ ...flightSample(0, reducedMotion), speed: 0, exit: 0, time: 0, reduced: reducedMotion, mobile }), [mobile, reducedMotion]);
  const ambientTime = useRef(0);
  const scroll = useRef({ value: 0, target: 0, offsets: [0, 1] });
  const exit = useRef({ value: 0 });
  const previousZ = useRef(Number.NaN);
  const lastChapter = useRef(-1);
  const presentation = useRef({ position: -1, exit: -1, paused, entering, reducedMotion });
  const frozenPosition = useRef<number | null>(null);
  const point = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const projection = useMemo(() => new THREE.Vector3(), []);
  const gate = useMemo(() => new THREE.Vector3(...VIRGO_STARS[3].position).setZ(VIRGO_STARS[3].position[2] + VIRGO_STARS[3].radius + 2), []);
  const exitPoint = useMemo(() => gate.clone().add(new THREE.Vector3(0, 0, .28)), [gate]);
  const gateDirection = useMemo(() => new THREE.Vector3(), []);
  const gateCenter = useMemo(() => new THREE.Vector3(...VIRGO_STARS[3].position), []);
  const frameOffset = useMemo(() => new THREE.Vector2(), []);
  const projectCenter = useMemo(() => new THREE.Vector3(...VIRGO_STARS[1].position), []);
  const glow = useGlowTexture();
  const panels = useMemo(() => Array.from(overlay.querySelectorAll<HTMLElement>(".virgo-overlay-panel")), [overlay]);
  const narration = useMemo(() => Array.from(overlay.querySelectorAll<HTMLElement>(".virgo-narrative-line")), [overlay]);
  const fracture = useMemo(() => overlay.parentElement!.querySelector<HTMLElement>(".virgo-intro-fracture")!, [overlay]);
  const fractureAudio = useRef<VirgoFractureAudio | null>(null);
  const fractureRift = useRef<VirgoSpaceRiftRenderer | null>(null);
  useEffect(() => {
    const player = new VirgoFractureAudio(
      fracture.querySelector<HTMLAudioElement>(".virgo-fracture-sound")!,
    );
    const renderer = new VirgoSpaceRiftRenderer(fracture.querySelector<HTMLCanvasElement>(".virgo-space-rift")!);
    fractureAudio.current = player;
    fractureRift.current = renderer;
    return () => { player.dispose(); renderer.dispose(); fractureAudio.current = null; fractureRift.current = null; };
  }, [fracture]);
  const narrativeRendered = useRef({ shown: -2, amount: -1 });
  const narrativeBounds = useRef({ shown: -2, width: 0, height: 0, lineHeight: 0, inkHeight: 0, lineWidth: 0, x: 0, y: 0, text: "" });
  const mobileReadingPlacement = useRef({ top: -1, controls: -1 });
  const narrativeStar = useMemo(() => new THREE.Vector3(), []);
  const narrativeEdge = useMemo(() => new THREE.Vector3(), []);
  const narrativeUp = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    let active = true;
    void document.fonts.ready.then(() => {
      if (!active) return;
      narrativeBounds.current.shown = -2;
      invalidate();
    });
    return () => { active = false; };
  }, [invalidate]);
  const labels = useMemo(() => Array.from(labelsRef.current?.children ?? []) as HTMLElement[], [labelsRef]);
  const { direction, framing } = useMemo(() => createCameraComposition(mobile), [mobile]);
  const paths = useMemo(() => createFlightPaths(mobile), [mobile]);

  useEffect(() => {
    if (mobile && size.height > 680) return;
    const controls = panels.map(panel => panel.querySelector<HTMLElement>(".virgo-bare")).filter((node): node is HTMLElement => !!node);
    const update = () => controls.forEach(node => {
      // Keep native scrolling only for genuinely overflowing short-screen
      // controls. Wheel input over a fitting panel must still move the story.
      if (node.scrollHeight > node.clientHeight + 1) node.dataset.lenisPrevent = "";
      else delete node.dataset.lenisPrevent;
    });
    const resize = new ResizeObserver(update);
    const mutation = new MutationObserver(update);
    controls.forEach(node => {
      resize.observe(node);
      mutation.observe(node, { childList: true, characterData: true, subtree: true });
    });
    update();
    return () => { resize.disconnect(); mutation.disconnect(); controls.forEach(node => delete node.dataset.lenisPrevent); };
  }, [mobile, size.height, panels]);

  useLayoutEffect(() => {
    const resize = () => {
      scroll.current.offsets = Array.from(content.children, child => (child as HTMLElement).offsetTop);
      scroll.current.target = flightPositionForScroll(scroller.scrollTop, scroll.current.offsets);
      invalidate();
    };
    const update = () => {
      scroll.current.target = flightPositionForScroll(scroller.scrollTop, scroll.current.offsets);
      invalidate();
    };
    resize();
    scroll.current.value = scroll.current.target;
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(resize);
    observer.observe(content);
    return () => { scroller.removeEventListener("scroll", update); observer.disconnect(); };
  }, [content, scroller, invalidate, reducedMotion]);

  useEffect(() => {
    if (!entering || reducedMotion) return;
    const animation = gsap.to(exit.current, { value: 1, duration: FLIGHT_MOTION.exitDuration, ease: "power2.inOut", onUpdate: invalidate });
    return () => { animation.kill(); exit.current.value = 0; };
  }, [entering, reducedMotion, invalidate]);
  useEffect(() => { invalidate(); }, [selectedProject, selectedSkill, paused, invalidate]);
  useLayoutEffect(() => {
    frozenPosition.current = entering ? flight.position : null;
  }, [entering, flight]);

  useFrame((_, delta) => {
    // Smooth native touch/keyboard jumps here, on the same frame as projection
    // and rendering. Continue demand frames until the camera catches up.
    const dt = Math.min(delta, .05);
    // Choreography follows scroll; orbital motion keeps the scene alive at rest.
    // Freeze the ambient clock for dialogs/hidden tabs and reduced motion.
    if (!reducedMotion && !paused && !entering) ambientTime.current += dt;
    flight.time = reducedMotion ? 0 : ambientTime.current;
    const target = scroll.current.target;
    scroll.current.value = reducedMotion ? target : paused ? scroll.current.value : protectOpeningHandoff(scroll.current.value, advancePacedFlightPosition(scroll.current.value, target, dt));
    const position = clamp(frozenPosition.current ?? scroll.current.value, 0, 6);
    Object.assign(flight, flightSample(position, reducedMotion, flight.time));
    flight.exit = exit.current.value;
    paths[flight.leg].getPointAt(flight.travel, point);
    const worldSpeed = Number.isFinite(previousZ.current) ? Math.abs(point.z - previousZ.current) / Math.max(delta, .016) : 0;
    previousZ.current = point.z;
    flight.speed = reducedMotion || paused ? 0 : THREE.MathUtils.damp(flight.speed, Math.min(1, worldSpeed / 160), 7, dt);
    camera.position.copy(point);
    gateDirection.copy(point).sub(gateCenter).normalize();
    gate.copy(gateCenter).addScaledVector(gateDirection, VIRGO_STARS[3].radius + 2);
    exitPoint.copy(gate).addScaledVector(gateDirection, .28);
    // The look point travels with the camera. Interpolating station targets
    // can put the target behind the camera halfway through a long passage.
    look.copy(point).add(direction);
    if (entering) { camera.position.lerp(exitPoint, flight.exit); look.lerp(gate, flight.exit); }
    camera.lookAt(look);
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = flightFieldOfView(position, mobile, reducedMotion, flight.exit);
    const passage = transitSample(position);
    // Hold each reading composition still. Switch sides while the passage is
    // centered, rather than sliding a star through the outgoing sentence.
    const stationChapters = [2, 3, 5, 6];
    const readingChapter = position < 1.82 ? 0 : position < 2.94 ? 2 : position < 4.80 ? 3 : position < 5.82 ? 5 : 6;
    const leg = passage.index < 0 ? null : TRANSIT_LEGS[passage.index];
    const owner = leg ? (passage.progress < .5 ? leg.origin : leg.destination) : null;
    const compositionChapter = owner === null ? readingChapter : owner < 0 ? 0 : stationChapters[owner];
    frameOffset.copy(framing[compositionChapter]).multiplyScalar((1 - flight.exit) * (1 - passage.envelope));
    const offsetX = -frameOffset.x * size.width / 2;
    const offsetY = frameOffset.y * size.height / 2;
    if (perspective.fov !== fov || perspective.far !== SPACE_LAYOUT.far || perspective.view?.fullWidth !== size.width || perspective.view?.fullHeight !== size.height || perspective.view?.offsetX !== offsetX || perspective.view?.offsetY !== offsetY) {
      perspective.fov = fov;
      perspective.far = SPACE_LAYOUT.far;
      perspective.setViewOffset(size.width, size.height, offsetX, offsetY, size.width, size.height);
    }
    camera.updateMatrixWorld();
    if (lastChapter.current !== flight.chapter) { lastChapter.current = flight.chapter; onChapter(flight.chapter); }
    const previousPresentation = presentation.current;
    const fractureActive = openingTransition(position, reducedMotion).active || spaceRiftFrame(position, reducedMotion).active;
    if (previousPresentation.position !== position || previousPresentation.exit !== flight.exit || previousPresentation.paused !== paused || previousPresentation.entering !== entering || previousPresentation.reducedMotion !== reducedMotion) {
      const transition = openingTransition(position, reducedMotion);
      panels.forEach((panel, i) => {
        const opacity = panelVisibility(i, position, reducedMotion) * (1 - transition.cover) * (1 - smooth(0, .5, flight.exit));
        panel.style.opacity = String(opacity);
        panel.style.visibility = opacity > .001 ? "visible" : "hidden";
        panel.style.transform = "none";
        panel.inert = opacity < .5 || paused || entering;
      });
      overlay.parentElement?.style.setProperty("--flight-progress", String(position / 6));
      overlay.parentElement?.style.setProperty("--flight-thrust", String(flight.thrust));
      overlay.parentElement?.style.setProperty("--intro-cover", String(transition.cover));
      overlay.parentElement?.style.setProperty("--intro-caption-lift", String(transition.lift));
      overlay.parentElement?.style.setProperty("--intro-flare", String(transition.flare));
      overlay.parentElement!.dataset.introFracture = fractureActive ? "active" : "idle";
      Object.assign(previousPresentation, { position, exit: flight.exit, paused, entering, reducedMotion });
    }
    fractureAudio.current?.update(position, paused || entering || document.hidden, reducedMotion, fracture.dataset.sound === "on");
    const narrative = narrativeSample(entering ? -1 : position, reducedMotion);
    const story = { shown: narrative.index };
    const amount = narrative.reveal;
    if (narrativeRendered.current.shown !== story.shown || narrativeRendered.current.amount !== amount) {
      narration.forEach((line, i) => {
        const visible = i === story.shown && amount > .001;
        line.style.opacity = visible ? "1" : "0";
        line.style.visibility = visible ? "visible" : "hidden";
        line.style.setProperty("--rift-reveal", String(amount));
        line.style.setProperty("--text-reveal", String(narrativeTextReveal(amount, reducedMotion)));
        line.setAttribute("aria-hidden", String(!visible));
      });
      const side = story.shown < 0 ? "none" : NARRATIVE_BEATS[story.shown].side;
      overlay.querySelector<HTMLElement>(".virgo-narrative")!.dataset.side = side;
      overlay.parentElement!.dataset.story = side;
      overlay.parentElement!.dataset.storyPlacement = story.shown < 0 ? "none" : NARRATIVE_BEATS[story.shown].placement;
      Object.assign(narrativeRendered.current, { shown: story.shown, amount });
    }
    const side = story.shown < 0 ? "none" : NARRATIVE_BEATS[story.shown].side;
    const bounds = narrativeBounds.current;
    let measureRift = false;
    const text = story.shown < 0 ? "" : narration[story.shown].textContent ?? "";
    if (bounds.shown !== story.shown || bounds.width !== size.width || bounds.height !== size.height || bounds.text !== text) {
      bounds.lineHeight = story.shown < 0 ? 0 : narration[story.shown].getBoundingClientRect().height;
      measureRift = true;
      Object.assign(bounds, { shown: story.shown, width: size.width, height: size.height, text });
    }
    if (mobile && side !== "none" && side !== "middle") {
      // Protect the actual projected stellar disk/halo, even during approach;
      // the fixed 48% subtitle slot used to cross larger close-up stars.
      const focused = focusedStarForPosition(position);
      let starBottom = 0;
      if (focused !== null) {
        const star = VIRGO_STARS[focused];
        narrativeStar.set(...star.position).project(camera);
        narrativeUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
        narrativeEdge.set(...star.position).addScaledVector(narrativeUp, star.radius * 1.6).project(camera);
        starBottom = (-narrativeStar.y * .5 + .5) * size.height + Math.abs(narrativeStar.y - narrativeEdge.y) * size.height * .5;
      }
      const preferredTop = NARRATIVE_BEATS[story.shown].placement.startsWith("lower") ? .54 : .50;
      const placement = mobileNarrativeTop(size.height, starBottom, bounds.lineHeight, preferredTop);
      if (placement.top !== mobileReadingPlacement.current.top || placement.controls !== mobileReadingPlacement.current.controls) {
        overlay.parentElement!.style.setProperty("--mobile-narrative-top", `${placement.top}px`);
        overlay.parentElement!.style.setProperty("--mobile-controls-top", `${placement.controls}px`);
        Object.assign(mobileReadingPlacement.current, placement);
        measureRift = true;
      }
    } else if (mobileReadingPlacement.current.top !== -1) {
      overlay.parentElement!.style.removeProperty("--mobile-narrative-top");
      overlay.parentElement!.style.removeProperty("--mobile-controls-top");
      mobileReadingPlacement.current = { top: -1, controls: -1 };
      measureRift = true;
    }
    if (measureRift && story.shown >= 0) {
      const range = document.createRange();
      range.selectNodeContents(narration[story.shown].querySelector("span")!);
      const rect = range.getBoundingClientRect();
      const origin = fracture.getBoundingClientRect();
      Object.assign(bounds, { x: rect.x - origin.x + rect.width / 2, y: rect.y - origin.y + rect.height / 2, lineWidth: rect.width, inkHeight: rect.height });
    }
    const riftReading = story.shown >= 0 && amount > .001 && !reducedMotion ? "active" : "idle";
    if (overlay.parentElement!.dataset.riftReading !== riftReading) overlay.parentElement!.dataset.riftReading = riftReading;
    fractureRift.current?.update(position, reducedMotion, paused || entering || document.hidden,
      story.shown >= 0 ? { reveal: amount, width: bounds.lineWidth, height: bounds.inkHeight, x: bounds.x, y: bounds.y, seed: story.shown, effect: NARRATIVE_BEATS[story.shown].effect } : undefined);
    projection.copy(gate).project(camera);
    if (portalRef.current) {
      portalRef.current.style.left = `${(projection.x * .5 + .5) * size.width}px`;
      portalRef.current.style.top = `${(-projection.y * .5 + .5) * size.height}px`;
    }
    labels.forEach((label, i) => {
      if (mobile || i !== selectedProject || flight.projects < .9 || paused || entering) { label.style.opacity = "0"; return; }
      const orbit = orbitPosition(i, projects.length, reducedMotion ? 3 : position, false, 1, flight.time);
      projection.set(orbit[0], orbit[1], orbit[2]).multiplyScalar(1.06).applyAxisAngle(THREE.Object3D.DEFAULT_UP, reducedMotion ? 0 : flight.outer * .52).add(projectCenter).project(camera);
      const x = (projection.x * .5 + .5) * size.width;
      const y = (-projection.y * .5 + .5) * size.height;
      const visible = x > size.width * .48 && x < size.width - 200 && y > 110 && y < size.height - 160;
      label.style.opacity = visible ? "1" : "0";
      label.style.transform = `translate3d(${x + 20}px,${y - 32}px,0)`;
    });
  }, -1);

  return <PlanetTextureLibrary mobile={mobile}>
    <VirgoOpening flight={flight} />
    <Starfield flight={flight} glow={glow} /><Nebula flight={flight} glow={glow} />
    <ambientLight intensity={.18} />
    {VIRGO_STARS.map(star => <pointLight key={star.name} position={star.position} intensity={2000} distance={120} color={star.color} />)}
    <VirgoTransit flight={flight} glow={glow} />
    {VIRGO_STARS.map((star, index) => <FocusedSystem key={star.name} index={index} flight={flight}>
      <VirgoNode index={index} flight={flight} glow={glow} />
      {index === 0 && <OriginForge flight={flight} glow={glow} />}
      {index === 1 && <SatelliteCluster kind="projects" flight={flight} glow={glow} selected={selectedProject} />}
      {index === 2 && <SatelliteCluster kind="skills" flight={flight} glow={glow} selected={selectedSkill} />}
      {index === 3 && <PortalGate flight={flight} glow={glow} gate={gate} />}
    </FocusedSystem>)}
    <FlightTrails flight={flight} /><ForegroundDebris flight={flight} />
  </PlanetTextureLibrary>;
}

export function VirgoScene(props: SceneProps) {
  const [visible, setVisible] = useState(() => document.visibilityState !== "hidden");
  useEffect(() => {
    const change = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  return <Canvas className="virgo-canvas" frameloop={!visible ? "never" : props.reducedMotion || props.paused ? "demand" : "always"} camera={{ position: [0, 0, 25 * SPACE_LAYOUT.interstellar], fov: 46, near: .1, far: SPACE_LAYOUT.far }} dpr={[1, props.reducedMotion ? 1 : 1.5]} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}>
    <color attach="background" args={["#020408"]} /><CameraFlight {...props} />
  </Canvas>;
}
