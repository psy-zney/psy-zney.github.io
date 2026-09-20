import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { VIRGO_STARS, VIRGO_SUPPORT_STARS } from "../data/virgoStations";
import { capabilities, projects } from "../data/portfolio";

export { VIRGO_STARS, VIRGO_SUPPORT_STARS } from "../data/virgoStations";

gsap.registerPlugin(ScrollTrigger);

export const CAMERA_STOPS = [
  new THREE.Vector3(0, 0, 24),
  new THREE.Vector3(-3.8, 0, 20),
  ...VIRGO_STARS.map((star, index) => new THREE.Vector3(star.position[0] + (index % 2 === 0 ? 1.9 : -1.9), star.position[1], 8.4)),
];

const MAIN_REVEAL_ORDER = [4, 2, 8, 11];
const SUPPORT_REVEAL_ORDER = [0, 5, 6, 3, 1, 7, 9, 10, 12, 13];

function Starfield() {
  const geometry = useMemo(() => {
    const random = (seed: number) => {
      const value = Math.sin(seed * 127.1 + 31.7) * 43758.5453;
      return value - Math.floor(value);
    };
    const positions = new Float32Array(1300 * 3);
    for (let i = 0; i < 1300; i++) {
      positions[i * 3] = (random(i * 3 + 1) - .5) * 86;
      positions[i * 3 + 1] = (random(i * 3 + 2) - .5) * 64;
      positions[i * 3 + 2] = -5 - random(i * 3 + 3) * 55;
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return result;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry} frustumCulled={false}>
    <pointsMaterial color="#bbcaeb" size={.075} transparent opacity={.78} sizeAttenuation depthWrite={false} />
  </points>;
}

function useGlowTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(.12, "rgba(255,255,255,.55)");
    gradient.addColorStop(.42, "rgba(255,255,255,.12)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function VirgoNode({ index, focusProgress, reveal, glow }: { index: number; focusProgress: { value: number }; reveal: { value: number }; glow: THREE.Texture }) {
  const star = VIRGO_STARS[index];
  const sprite = useRef<THREE.Sprite>(null);
  const core = useRef<THREE.Mesh>(null);
  const pingA = useRef<THREE.Mesh>(null);
  const pingB = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const intensity = Math.max(0, 1 - Math.abs(focusProgress.value - (index + 1)) * 1.7);
    const appearance = THREE.MathUtils.smoothstep(reveal.value * 32 - MAIN_REVEAL_ORDER[index] * 2, 0, 1);
    const scale = (3 + intensity * 1.35 + Math.sin(clock.elapsedTime * 2 + index) * .08) * Math.max(.01, appearance);
    if (sprite.current) {
      sprite.current.scale.set(scale, scale, 1);
      (sprite.current.material as THREE.SpriteMaterial).opacity = (.68 + intensity * .26) * appearance;
    }
    if (core.current) {
      (core.current.material as THREE.MeshBasicMaterial).color.set(star.color);
      core.current.scale.setScalar((1 + intensity * .38) * Math.max(.01, appearance));
    }
    [pingA.current, pingB.current].forEach((ping, pingIndex) => {
      if (!ping) return;
      const phase = (clock.elapsedTime * .42 + pingIndex * .5) % 1;
      ping.visible = intensity > .03 && appearance > .03;
      ping.scale.setScalar(1 + phase * 4.5);
      (ping.material as THREE.MeshBasicMaterial).opacity = intensity * appearance * (1 - phase) * .42;
    });
  });

  return <group position={star.position}>
    <sprite ref={sprite}>
      <spriteMaterial map={glow} color={star.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
    <mesh ref={core}>
      <sphereGeometry args={[.095, 12, 12]} />
      <meshBasicMaterial color={star.color} toneMapped={false} />
    </mesh>
    <mesh ref={pingA}>
      <ringGeometry args={[.14, .153, 48]} />
      <meshBasicMaterial color={star.color} transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh ref={pingB}>
      <ringGeometry args={[.14, .153, 48]} />
      <meshBasicMaterial color={star.color} transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  </group>;
}

function SupportNode({ index, reveal, glow }: { index: number; reveal: { value: number }; glow: THREE.Texture }) {
  const star = VIRGO_SUPPORT_STARS[index];
  const sprite = useRef<THREE.Sprite>(null);
  const core = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const appearance = THREE.MathUtils.smoothstep(reveal.value * 32 - SUPPORT_REVEAL_ORDER[index] * 2, 0, 1);
    if (sprite.current) {
      sprite.current.scale.setScalar((1.3 + Math.sin(clock.elapsedTime * 1.4 + index) * .045) * Math.max(.01, appearance));
      (sprite.current.material as THREE.SpriteMaterial).opacity = appearance * .38;
    }
    if (core.current) core.current.scale.setScalar(Math.max(.01, appearance));
  });
  return <group position={star.position}>
    <sprite ref={sprite}><spriteMaterial map={glow} color={star.color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    <mesh ref={core}><sphereGeometry args={[.047, 10, 10]} /><meshBasicMaterial color={star.color} toneMapped={false} /></mesh>
  </group>;
}

function OrbitRing({ radius, ring, opacity, color }: { radius: number; ring: number; opacity: { value: number }; color: string }) {
  const group = useRef<THREE.Group>(null);
  const orbit = useMemo(() => {
    const points = Array.from({ length: 96 }, (_, index) => {
      const angle = index / 96 * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * (.46 + ring * .025),
        Math.sin(angle) * radius * (.08 + ring * .026),
      );
    });
    return new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }),
    );
  }, [radius, ring, color]);
  useFrame(({ clock }) => {
    (orbit.material as THREE.LineBasicMaterial).opacity = opacity.value * (.28 - ring * .025);
    if (group.current) group.current.rotation.z = Math.sin(clock.elapsedTime * .08 + ring) * .035 + ring * .055;
  });
  useEffect(() => () => { orbit.geometry.dispose(); (orbit.material as THREE.Material).dispose(); }, [orbit]);
  return <group ref={group} rotation-x={ring % 2 ? .06 : -.04}><primitive object={orbit} /></group>;
}

function SystemCore({ glow, opacity, color }: { glow: THREE.Texture; opacity: { value: number }; color: string }) {
  const sprite = useRef<THREE.Sprite>(null);
  const core = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.5) * .055;
    if (sprite.current) {
      sprite.current.scale.setScalar(2.2 * pulse);
      (sprite.current.material as THREE.SpriteMaterial).opacity = opacity.value * .56;
    }
    if (core.current) {
      core.current.scale.setScalar(pulse);
      (core.current.material as THREE.MeshBasicMaterial).opacity = opacity.value;
    }
    if (light.current) light.current.intensity = opacity.value * 6;
  });
  return <group>
    <sprite ref={sprite} renderOrder={3}><spriteMaterial map={glow} color={color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    <mesh ref={core} renderOrder={3}><sphereGeometry args={[.17, 24, 18]} /><meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} /></mesh>
    <pointLight ref={light} color={color} intensity={0} distance={5.5} decay={2} />
  </group>;
}

function OrbitingPlanet({ index, count, ring, radius, color, glow, opacity, highlighted }: {
  index: number;
  count: number;
  ring: number;
  radius: number;
  color: string;
  glow: THREE.Texture;
  opacity: { value: number };
  highlighted: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const sprite = useRef<THREE.Sprite>(null);
  const core = useRef<THREE.Mesh>(null);
  const planetRing = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const direction = ring % 2 ? -1 : 1;
    const angle = (index / count) * Math.PI * 2 + clock.elapsedTime * (.105 + ring * .034 + index % 3 * .009) * direction;
    if (group.current) group.current.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * (.46 + ring * .025),
      Math.sin(angle) * radius * (.08 + ring * .026),
    );
    if (sprite.current) {
      sprite.current.visible = opacity.value > .008;
      sprite.current.scale.setScalar(highlighted ? .8 : .45);
      (sprite.current.material as THREE.SpriteMaterial).opacity = opacity.value * (highlighted ? .68 : .25);
    }
    if (core.current) {
      core.current.visible = opacity.value > .008;
      core.current.scale.setScalar(highlighted ? 1.36 : 1);
      core.current.rotation.y = clock.elapsedTime * (.28 + index * .025);
      (core.current.material as THREE.MeshStandardMaterial).opacity = opacity.value;
    }
    if (planetRing.current) {
      planetRing.current.visible = opacity.value > .008;
      planetRing.current.rotation.z = clock.elapsedTime * .08;
      (planetRing.current.material as THREE.MeshBasicMaterial).opacity = opacity.value * .6;
    }
    if (moon.current) {
      const moonAngle = clock.elapsedTime * (.65 + index * .03);
      moon.current.position.set(Math.cos(moonAngle) * .2, Math.sin(moonAngle) * .11, .025);
      moon.current.visible = opacity.value > .008;
      (moon.current.material as THREE.MeshBasicMaterial).opacity = opacity.value * .8;
    }
  });
  return <group ref={group}>
    <sprite ref={sprite} renderOrder={3}><spriteMaterial map={glow} color={color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    <mesh ref={core} renderOrder={3}><sphereGeometry args={[.095 + (index % 3) * .016, 16, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.28} metalness={.3} roughness={.35} transparent opacity={0} depthWrite={false} /></mesh>
    {index % 4 === 1 && <mesh ref={planetRing} renderOrder={4} rotation-x={1.16}><torusGeometry args={[.16, .009, 8, 40]} /><meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} /></mesh>}
    {index % 3 === 0 && <mesh ref={moon} renderOrder={4}><sphereGeometry args={[.025, 8, 8]} /><meshBasicMaterial color="#d9e4f7" transparent opacity={0} depthWrite={false} /></mesh>}
  </group>;
}

function SatelliteCluster({ kind, glow, progress, selected, isMobile }: {
  kind: "projects" | "skills";
  glow: THREE.Texture;
  progress: { value: number };
  selected: number | null;
  isMobile: boolean;
}) {
  const isProject = kind === "projects";
  const entries = isProject ? projects : capabilities;
  const station = isProject ? 2 : 3;
  const radii = isProject ? [1.34, 1.94, 2.62] : [1.22, 1.86];
  const opacity = useRef({ value: 0 });
  useFrame((_, delta) => {
    opacity.current.value = THREE.MathUtils.damp(opacity.current.value, Math.max(0, 1 - Math.abs(progress.value - station) * 1.5), 8, delta);
  });
  return <group position={VIRGO_STARS[station - 1].position} scale={isMobile ? .7 : 1.06}>
    <SystemCore glow={glow} opacity={opacity.current} color={isProject ? "#f8dfac" : "#c7ccff"} />
    {radii.map((radius, ring) => <OrbitRing key={radius} radius={radius} ring={ring} color={isProject ? "#f0c795" : "#a8baff"} opacity={opacity.current} />)}
    {entries.map((entry, index) => <OrbitingPlanet
      key={entry.id}
      index={index}
      count={entries.length}
      ring={index % radii.length}
      radius={radii[index % radii.length]}
      color={isProject ? projects[index].color : VIRGO_STARS[2].color}
      glow={glow}
      opacity={opacity.current}
      highlighted={selected === index}
    />)}
  </group>;
}

function ConstellationEdge({ from, to, index, reveal, focusProgress }: {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  index: number;
  reveal: { value: number };
  focusProgress: { value: number };
}) {
  const line = useMemo(() => {
    const start = new THREE.Vector3(from[0], from[1], -.42);
    const positions = new Float32Array([start.x, start.y, start.z, start.x, start.y, start.z]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: "#9eb9e8", transparent: true, opacity: 0, depthWrite: false, depthTest: true }),
    );
  }, [from]);

  useEffect(() => () => {
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
  }, [line]);

  useFrame(() => {
    const progress = THREE.MathUtils.smoothstep(reveal.value * 32 - (index * 2 + 1), 0, 1);
    const positions = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    positions.setXYZ(
      1,
      THREE.MathUtils.lerp(from[0], to[0], progress),
      THREE.MathUtils.lerp(from[1], to[1], progress),
      -.42,
    );
    positions.needsUpdate = true;
    const zoomFade = THREE.MathUtils.lerp(.24, .105, Math.min(1, focusProgress.value));
    (line.material as THREE.LineBasicMaterial).opacity = progress * zoomFade;
  });

  return <primitive object={line} renderOrder={-10} />;
}

function VirgoLines({ reveal, focusProgress }: { reveal: { value: number }; focusProgress: { value: number } }) {
  const main = VIRGO_STARS.map(star => star.position);
  const support = VIRGO_SUPPORT_STARS.map(star => star.position);
  const edges = [
    [support[0], support[4]], [support[4], main[1]],
    [main[1], support[3]], [support[3], main[0]],
    [main[0], support[1]], [main[0], support[2]],
    [main[1], support[5]], [support[5], main[2]],
    [main[2], support[6]], [support[6], support[7]],
    [support[7], main[3]], [main[3], support[8]],
    [main[3], support[9]], [support[9], support[3]],
    [main[1], main[2]], [main[1], main[3]],
  ] as const;
  return <>{edges.map(([from, to], index) => <ConstellationEdge key={index} from={from} to={to} index={index} reveal={reveal} focusProgress={focusProgress} />)}</>;
}

function CameraFlight({ scroller, content, overlay, onChapter, reducedMotion, selectedProject, selectedSkill, portalRef }: {
  scroller: HTMLElement;
  content: HTMLElement;
  overlay: HTMLElement;
  onChapter: (index: number) => void;
  reducedMotion: boolean;
  selectedProject: number | null;
  selectedSkill: number | null;
  portalRef: RefObject<HTMLButtonElement>;
}) {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const focusProgress = useRef({ value: 0 });
  const reveal = useRef({ value: reducedMotion ? 1 : 0 });
  const portalPoint = useMemo(() => new THREE.Vector3(...VIRGO_STARS[3].position), []);
  const glow = useGlowTexture();
  const isMobile = size.width < 700;

  useFrame(() => {
    camera.lookAt(look.current);
    if (portalRef.current) {
      portalPoint.set(VIRGO_STARS[3].position[0], VIRGO_STARS[3].position[1], VIRGO_STARS[3].position[2]).project(camera);
      portalRef.current.style.left = `${(portalPoint.x * .5 + .5) * size.width}px`;
      portalRef.current.style.top = `${(-portalPoint.y * .5 + .5) * size.height}px`;
    }
  });

  useEffect(() => {
    reveal.current.value = reducedMotion ? 1 : 0;
    if (reducedMotion) return;
    const tween = gsap.to(reveal.current, { value: 1, duration: 8.4, ease: "power1.inOut" });
    return () => { tween.kill(); };
  }, [reducedMotion]);

  useEffect(() => {
    const overview = CAMERA_STOPS[0].clone();
    const heroStop = CAMERA_STOPS[1].clone();
    if (isMobile) { overview.set(0, 0, 48); heroStop.set(-.6, 0, 40); }
    const path = new THREE.CatmullRomCurve3([overview, heroStop, ...CAMERA_STOPS.slice(2)], false, "centripetal");
    const panels = Array.from(overlay.querySelectorAll<HTMLElement>(".virgo-overlay-panel"));
    const context = gsap.context(() => {
      camera.position.copy(overview);
      look.current.set(overview.x, 0, 0);
      focusProgress.current.value = 0;
      gsap.set(panels, { autoAlpha: 0 });
      gsap.set(panels[0], { autoAlpha: 1 });

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: () => {
          onChapter(Math.min(6, Math.round(timeline.progress() * 6)));
          camera.updateProjectionMatrix();
        },
        scrollTrigger: {
          trigger: content,
          scroller,
          start: "top top",
          end: "bottom bottom",
          scrub: reducedMotion ? true : 0.42,
          invalidateOnRefresh: true,
        },
      });

      for (let leg = 1; leg <= 6; leg++) {
        const begin = leg - 1;
        const travel = reducedMotion ? 0.15 : 0.92;
        const travelStart = begin + 0.04;
        const holdsAtPorrima = leg === 4;
        const routeLeg = leg > 4 ? leg - 1 : leg;

        if (!holdsAtPorrima) {
          // Five spatial legs remain on the same curve. The fourth content leg
          // is deliberately a camera hold at Porrima for the project archive.
          const STEPS = 16;
          for (let step = 1; step <= STEPS; step++) {
            const point = path.getPointAt((routeLeg - 1 + step / STEPS) / 5);
            timeline.to(camera.position, {
              x: point.x, y: point.y, z: point.z,
              duration: travel / STEPS,
              ease: "none",
            }, travelStart + (step - 1) * travel / STEPS);
          }
        }

        const starIndex = leg === 1 ? -1 : leg === 4 ? 1 : leg > 4 ? leg - 3 : leg - 2;
        const star = starIndex >= 0 ? VIRGO_STARS[starIndex] : undefined;
        if (!holdsAtPorrima) {
          timeline.to(look.current, {
            x: star ? star.position[0] + (isMobile ? 0 : starIndex % 2 === 0 ? 1.25 : -1.25) : heroStop.x,
            y: star ? star.position[1] - (isMobile ? (starIndex === 2 ? 2.55 : 1.35) : 0) : 0,
            z: 0,
            duration: travel,
            ease: "power1.inOut",
          }, travelStart);
          timeline.to(camera, {
            fov: star ? (isMobile ? 51 : 48) : 45,
            duration: travel,
            ease: "power1.inOut",
          }, travelStart);
        }

        if (star && !holdsAtPorrima) {
          timeline.to(focusProgress.current, {
            value: starIndex + 1,
            duration: travel,
            ease: "power1.inOut",
          }, travelStart);
        }

        // A short hand-off keeps continuity without letting two full cards
        // occupy the viewport together.
        const outgoing = panels[leg - 1];
        const incoming = panels[leg];
        const isHorizontalProjectHandoff = leg === 4;
        const drift = leg % 2 === 0 ? -.65 : .65;

        timeline.set(incoming, {
          autoAlpha: 0,
          yPercent: reducedMotion || isHorizontalProjectHandoff ? 0 : 24,
          xPercent: reducedMotion ? 0 : isHorizontalProjectHandoff ? 26 : drift,
          scale: reducedMotion ? 1 : 0.98,
          zIndex: 1,
        }, begin + 0.34);
        timeline.set(outgoing, { zIndex: 2 }, begin + 0.04);

        timeline.to(outgoing, {
          autoAlpha: 0,
          yPercent: reducedMotion || isHorizontalProjectHandoff ? 0 : -18,
          xPercent: reducedMotion ? 0 : isHorizontalProjectHandoff ? -22 : -drift,
          scale: reducedMotion ? 1 : 0.96,
          duration: reducedMotion ? 0.18 : 0.42,
          ease: "power2.inOut",
        }, begin + 0.04);

        timeline.to(incoming, {
          autoAlpha: 1,
          yPercent: 0,
          xPercent: 0,
          scale: 1,
          duration: reducedMotion ? 0.18 : 0.52,
          ease: "power2.out",
        }, begin + 0.4);
        timeline.set(outgoing, { autoAlpha: 0 }, begin + 0.48);
      }
      // A final hold ensures the last chapter is visible at the end of the scrollbar.
      timeline.set({}, {}, 6);
    }, scroller);
    ScrollTrigger.refresh();
    return () => context.revert();
  }, [camera, content, isMobile, onChapter, overlay, reducedMotion, scroller]);

  return <>
    <Starfield />
    <ambientLight intensity={.65} />
    <pointLight position={[2, 5, 9]} intensity={24} color="#e2ebff" />
    <VirgoLines reveal={reveal.current} focusProgress={focusProgress.current} />
    {VIRGO_STARS.map((star, index) => <VirgoNode key={star.name} index={index} focusProgress={focusProgress.current} reveal={reveal.current} glow={glow} />)}
    {VIRGO_SUPPORT_STARS.map((_, index) => <SupportNode key={index} index={index} reveal={reveal.current} glow={glow} />)}
    <SatelliteCluster kind="projects" glow={glow} progress={focusProgress.current} selected={selectedProject} isMobile={isMobile} />
    <SatelliteCluster kind="skills" glow={glow} progress={focusProgress.current} selected={selectedSkill} isMobile={isMobile} />
  </>;
}

export function VirgoScene(props: Parameters<typeof CameraFlight>[0]) {
  return <Canvas className="virgo-canvas" camera={{ position: [0, 0, 24], fov: 45, near: .1, far: 150 }} dpr={[1, 1.6]} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}>
    <color attach="background" args={["#000000"]} />
    <CameraFlight {...props} />
  </Canvas>;
}
