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
  new THREE.Vector3(0, 0, 20),
  new THREE.Vector3(-3.4, 0, 18),
  ...VIRGO_STARS.map(star => new THREE.Vector3(star.position[0] - 1.6, star.position[1], 6.8)),
];

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
  useFrame(({ clock }) => {
    const intensity = Math.max(0, 1 - Math.abs(focusProgress.value - (index + 1)) * 1.7);
    const appearance = THREE.MathUtils.smoothstep(reveal.value * 4 - index * .65, 0, 1);
    const scale = (3 + intensity * 1.35 + Math.sin(clock.elapsedTime * 2 + index) * .08) * Math.max(.01, appearance);
    if (sprite.current) {
      sprite.current.scale.set(scale, scale, 1);
      (sprite.current.material as THREE.SpriteMaterial).opacity = (.68 + intensity * .26) * appearance;
    }
    if (core.current) {
      (core.current.material as THREE.MeshBasicMaterial).color.set(star.color);
      core.current.scale.setScalar((1 + intensity * .38) * Math.max(.01, appearance));
    }
  });

  return <group position={star.position}>
    <sprite ref={sprite}>
      <spriteMaterial map={glow} color={star.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
    <mesh ref={core}>
      <sphereGeometry args={[.095, 12, 12]} />
      <meshBasicMaterial color={star.color} toneMapped={false} />
    </mesh>
  </group>;
}

function SupportNode({ index, reveal, glow }: { index: number; reveal: { value: number }; glow: THREE.Texture }) {
  const star = VIRGO_SUPPORT_STARS[index];
  const sprite = useRef<THREE.Sprite>(null);
  const core = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const appearance = THREE.MathUtils.smoothstep(reveal.value * 4 - index * .25, 0, 1);
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

function OrbitRing({ radius, opacity, color }: { radius: number; opacity: { value: number }; color: string }) {
  const orbit = useMemo(() => {
    const points = Array.from({ length: 96 }, (_, index) => {
      const angle = index / 96 * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * .48, Math.sin(angle) * .17);
    });
    return new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }),
    );
  }, [radius, color]);
  useFrame(() => { (orbit.material as THREE.LineBasicMaterial).opacity = opacity.value * .34; });
  useEffect(() => () => { orbit.geometry.dispose(); (orbit.material as THREE.Material).dispose(); }, [orbit]);
  return <primitive object={orbit} />;
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
  useFrame(({ clock }) => {
    const angle = (index / count) * Math.PI * 2 + clock.elapsedTime * (.16 + ring * .05) * (ring % 2 ? -1 : 1);
    if (group.current) group.current.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * .48,
      Math.sin(angle) * .17,
    );
    if (sprite.current) {
      sprite.current.visible = opacity.value > .008;
      sprite.current.scale.setScalar(highlighted ? .8 : .45);
      (sprite.current.material as THREE.SpriteMaterial).opacity = opacity.value * (highlighted ? .68 : .25);
    }
    if (core.current) {
      core.current.visible = opacity.value > .008;
      core.current.scale.setScalar(highlighted ? 1.36 : 1);
      (core.current.material as THREE.MeshStandardMaterial).opacity = opacity.value;
    }
  });
  return <group ref={group}>
    <sprite ref={sprite}><spriteMaterial map={glow} color={color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
    <mesh ref={core}><sphereGeometry args={[.095 + (index % 3) * .016, 16, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.28} metalness={.3} roughness={.35} transparent opacity={0} depthWrite={false} /></mesh>
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
  const radii = isProject ? [1.08, 1.54, 2.04] : [1.1, 1.68];
  const opacity = useRef({ value: 0 });
  useFrame((_, delta) => {
    opacity.current.value = THREE.MathUtils.damp(opacity.current.value, Math.max(0, 1 - Math.abs(progress.value - station) * 1.5), 8, delta);
  });
  return <group position={VIRGO_STARS[station - 1].position} scale={isMobile ? .72 : 1}>
    {radii.map(radius => <OrbitRing key={radius} radius={radius} color={isProject ? "#f0c795" : "#a8baff"} opacity={opacity.current} />)}
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

function VirgoLines({ reveal }: { reveal: { value: number } }) {
  const geometry = useMemo(() => {
    const main = VIRGO_STARS.map(star => star.position);
    const support = VIRGO_SUPPORT_STARS.map(star => star.position);
    const edges = [
      [support[0], support[4]], [support[4], main[1]],
      [support[1], main[0]], [support[2], main[0]],
      [main[0], support[3]], [support[3], main[1]],
      [main[1], support[5]], [support[5], main[2]],
      [main[2], support[6]], [support[6], support[7]],
      [support[7], main[3]], [main[3], support[8]],
      [main[3], support[9]], [support[9], support[3]],
      [main[1], main[2]], [main[1], main[3]],
    ];
    return new THREE.BufferGeometry().setFromPoints(edges.flatMap(([from, to]) => [new THREE.Vector3(...from), new THREE.Vector3(...to)]));
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  // line distances are required for LineDashedMaterial to draw actual dashes.
  const line = useMemo(() => {
    const result = new THREE.LineSegments(geometry, new THREE.LineDashedMaterial({ color: "#8cafff", transparent: true, opacity: .38, dashSize: .14, gapSize: .12, depthWrite: false }));
    result.computeLineDistances();
    return result;
  }, [geometry]);
  useEffect(() => () => (line.material as THREE.Material).dispose(), [line]);
  useFrame(() => { (line.material as THREE.LineDashedMaterial).opacity = reveal.value * .58; });
  return <primitive object={line} />;
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
    const tween = gsap.to(reveal.current, { value: 1, duration: 1.75, ease: "power2.inOut" });
    return () => { tween.kill(); };
  }, [reducedMotion]);

  useEffect(() => {
    const overview = CAMERA_STOPS[0].clone();
    const heroStop = CAMERA_STOPS[1].clone();
    if (isMobile) { overview.set(0, 0, 42); heroStop.set(-.5, 0, 36); }
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
        onUpdate: () => onChapter(Math.min(5, Math.round(timeline.progress() * 5))),
        scrollTrigger: {
          trigger: content,
          scroller,
          start: "top top",
          end: "bottom bottom",
          scrub: reducedMotion ? true : 1,
          invalidateOnRefresh: true,
        },
      });

      for (let leg = 1; leg <= 5; leg++) {
        const begin = leg - 1;
        const travel = reducedMotion ? .12 : leg === 1 ? .85 : leg === 2 ? .42 : .68;
        // Sampling a Catmull-Rom curve into GSAP camera.position tweens gives
        // ScrollTrigger direct ownership of the camera's world-space position.
        for (let step = 1; step <= 8; step++) {
          const point = path.getPointAt((leg - 1 + step / 8) / 5);
          timeline.to(camera.position, {
            x: point.x, y: point.y, z: point.z,
            duration: travel / 8,
          }, begin + (step - 1) * travel / 8);
        }
        const star = VIRGO_STARS[leg - 2];
        timeline.to(look.current, {
          x: star ? star.position[0] - (isMobile ? 0 : 1.1) : heroStop.x,
          y: star ? star.position[1] - (isMobile ? (leg === 4 ? 2.35 : 1.25) : 0) : 0,
          z: 0,
          duration: travel,
          ease: "power2.inOut",
        }, begin);
        if (star) timeline.to(focusProgress.current, { value: leg - 1, duration: travel }, begin);
        // Crossfade the cards while the camera is moving. Keeping the two
        // tweens overlapped avoids a blank chapter during a slow scrub.
        if (leg > 1) timeline.to(panels[leg - 1], { autoAlpha: 0, x: -38, y: -8, duration: .3, ease: "power2.in" }, begin + .3);
        timeline.fromTo(panels[leg], { autoAlpha: 0, x: 46, y: 10 }, { autoAlpha: 1, x: 0, y: 0, duration: leg === 1 ? .28 : .38, ease: "power2.out" }, begin + (leg === 1 ? .69 : .32));
      }
      // A final hold ensures the last chapter is visible at the end of the scrollbar.
      timeline.set({}, {}, 5);
    }, scroller);
    ScrollTrigger.refresh();
    return () => context.revert();
  }, [camera, content, isMobile, onChapter, overlay, reducedMotion, scroller]);

  return <>
    <Starfield />
    <ambientLight intensity={.65} />
    <pointLight position={[2, 5, 9]} intensity={24} color="#e2ebff" />
    <VirgoLines reveal={reveal.current} />
    {VIRGO_STARS.map((star, index) => <VirgoNode key={star.name} index={index} focusProgress={focusProgress.current} reveal={reveal.current} glow={glow} />)}
    {VIRGO_SUPPORT_STARS.map((_, index) => <SupportNode key={index} index={index} reveal={reveal.current} glow={glow} />)}
    <SatelliteCluster kind="projects" glow={glow} progress={focusProgress.current} selected={selectedProject} isMobile={isMobile} />
    <SatelliteCluster kind="skills" glow={glow} progress={focusProgress.current} selected={selectedSkill} isMobile={isMobile} />
  </>;
}

export function VirgoScene(props: Parameters<typeof CameraFlight>[0]) {
  return <Canvas className="virgo-canvas" camera={{ position: [0, 0, 21], fov: 45, near: .1, far: 150 }} dpr={[1, 1.6]} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}>
    <color attach="background" args={["#000000"]} />
    <CameraFlight {...props} />
  </Canvas>;
}
