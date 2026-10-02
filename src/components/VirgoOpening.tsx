import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OPENING_EDGES, OPENING_STARS, openingEdgeProgress, openingPresentation, openingScreenPlane, openingStarAppearance } from "../data/virgoOpening";
import { type FlightSample } from "../data/virgoFlight";

type OpeningFlight = FlightSample & { time: number; reduced: boolean; mobile: boolean };
const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453; return n - Math.floor(n); };

export function VirgoOpening({ flight }: { flight: OpeningFlight }) {
  const { camera } = useThree();
  const anchor = useRef<THREE.Group>(null);
  const lights = useRef<THREE.Group>(null);
  const lines = useRef<THREE.LineBasicMaterial>(null);
  const points = useRef<THREE.PointsMaterial>(null);
  const previousGeometry = useRef({ reveal: -1 });
  const { glow, field, edges } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(.12, "rgba(255,255,255,.55)");
    gradient.addColorStop(.42, "rgba(255,255,255,.12)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    const field = new THREE.BufferGeometry();
    const positions = new Float32Array(1300 * 3);
    for (let i = 0; i < 1300; i++) {
      positions[i * 3] = (random(i * 3 + 1) - .5) * 86;
      positions[i * 3 + 1] = (random(i * 3 + 2) - .5) * 64;
      positions[i * 3 + 2] = -5 - random(i * 3 + 3) * 55;
    }
    field.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const edges = new THREE.BufferGeometry();
    edges.setAttribute("position", new THREE.BufferAttribute(new Float32Array(OPENING_EDGES.length * 12), 3));
    return { glow: new THREE.CanvasTexture(canvas), field, edges };
  }, []);
  useEffect(() => () => { glow.dispose(); field.dispose(); edges.dispose(); }, [glow, field, edges]);
  useLayoutEffect(() => { previousGeometry.current = { reveal: -1 }; }, [edges]);
  useFrame(() => {
    if (!anchor.current || !lights.current) return;
    const handoff = openingPresentation(flight.position);
    anchor.current.visible = handoff.opening;
    if (!anchor.current.visible) return;
    anchor.current.position.copy(camera.position);
    // Keep the original screen composition and light sizes until the fracture
    // covers the swap. Compensate both the lens and off-axis station framing.
    anchor.current.quaternion.copy(camera.quaternion);
    const perspective = camera as THREE.PerspectiveCamera;
    const plane = openingScreenPlane(perspective.fov, flight.mobile, perspective.projectionMatrix.elements);
    lights.current.parent!.position.set(plane.x, plane.y, plane.z);
    lights.current.children.forEach((child, index) => {
      const star = OPENING_STARS[index];
      const appearance = openingStarAppearance(index, flight.reveal);
      const group = child as THREE.Group;
      group.position.set(star.position[0], star.position[1], 0);
      const sprite = group.children[0] as THREE.Sprite;
      sprite.scale.setScalar(star.main ? 3 : 1.3);
      (sprite.material as THREE.SpriteMaterial).opacity = appearance * (star.main ? .68 : .38);
      const core = group.children[1] as THREE.Mesh;
      core.scale.setScalar(Math.max(.001, appearance));
      (core.material as THREE.MeshBasicMaterial).opacity = appearance;
    });
    // Positions stay fixed, so upload branch endpoints only as the wave grows.
    const previous = previousGeometry.current;
    if (previous.reveal !== flight.reveal) {
      const positions = edges.getAttribute("position") as THREE.BufferAttribute;
      OPENING_EDGES.forEach(([a, b], i) => {
        const from = lights.current!.children[a].position, to = lights.current!.children[b].position;
        const [leading, trailing] = openingEdgeProgress(i, flight.reveal);
        positions.setXYZ(i * 4, from.x, from.y, -.04);
        positions.setXYZ(i * 4 + 1, THREE.MathUtils.lerp(from.x, to.x, leading), THREE.MathUtils.lerp(from.y, to.y, leading), -.04);
        positions.setXYZ(i * 4 + 2, to.x, to.y, -.04);
        positions.setXYZ(i * 4 + 3, THREE.MathUtils.lerp(to.x, from.x, trailing), THREE.MathUtils.lerp(to.y, from.y, trailing), -.04);
      });
      positions.needsUpdate = true;
      previous.reveal = flight.reveal;
    }
    if (lines.current) lines.current.opacity = .28;
    if (points.current) points.current.opacity = .78;
  });
  return <group ref={anchor}>
    <group>
      <points geometry={field} frustumCulled={false}><pointsMaterial ref={points} color="#bbcaeb" size={.075} transparent depthWrite={false} /></points>
      <lineSegments geometry={edges} frustumCulled={false}><lineBasicMaterial ref={lines} color="#9abde9" transparent depthWrite={false} /></lineSegments>
      <group ref={lights}>{OPENING_STARS.map((star, i) => <group key={i} position={star.position as [number, number, number]}>
        <sprite><spriteMaterial map={glow} color={star.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
        <mesh><sphereGeometry args={[star.main ? .095 : .047, 12, 10]} /><meshBasicMaterial color={star.color} transparent toneMapped={false} depthWrite={false} /></mesh>
      </group>)}</group>
    </group>
  </group>;
}
