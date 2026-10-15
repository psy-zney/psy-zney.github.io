import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { systemPresence } from '../data/virgoTransit';
import { STELLAR_NOISE_GLSL, stellarProminence, prominenceTiming, prominenceSample } from '../data/virgoStellarEffects';

type StellarFlight = { position: number; time: number; reduced: boolean; mobile: boolean; tier: 'low' | 'medium' | 'high' };
const PLASMA_VERTEX = `
  uniform float age; uniform float radius; uniform float enabled;
  attribute vec3 eruptionTiming;
  varying vec2 plasmaUv; varying float eruption; varying float life;
  varying vec3 plasmaNormal; varying vec3 plasmaView;
  void main(){
    plasmaUv=uv; life=clamp(mod(age+eruptionTiming.z,eruptionTiming.x)/eruptionTiming.y,0.0,1.0);
    eruption=smoothstep(0.0,.25,life)*(1.0-smoothstep(.6,1.0,life))*enabled;
    vec3 base=normalize(position)*radius*1.002;
    vec3 p=mix(base,position,smoothstep(0.0,.55,life));
    p+=normal*sin(uv.x*23.0-age*3.0)*radius*.008*eruption;
    vec4 view=modelViewMatrix*vec4(p,1.0); plasmaView=-view.xyz; plasmaNormal=normalMatrix*normal;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }
`;
const PLASMA_FRAGMENT = `
  uniform float age; uniform float appearance; uniform vec3 tint; varying vec2 plasmaUv;
  varying float eruption; varying float life; varying vec3 plasmaNormal; varying vec3 plasmaView;
  ${STELLAR_NOISE_GLSL}
  void main(){
    if(eruption*appearance<.002)discard;
    float gas=stellarFbm(vec2(plasmaUv.x*11.0-age*.8,plasmaUv.y*4.0+age*.25));
    float limb=pow(abs(dot(normalize(plasmaNormal),normalize(plasmaView))),.65);
    float footDistance=min(plasmaUv.x,1.0-plasmaUv.x)*2.0;
    float front=1.0-smoothstep(life*2.8,life*2.8+.22,footDistance);
    float density=smoothstep(.27,.72,gas)*limb*front;
    vec3 color=tint*(.65+gas*.7);
    gl_FragColor=vec4(color,appearance*eruption*density*.8); }
`;

/** Cached coronal loops and hot tips; all motion stays on the star. */
export function StellarPlasma({ index, radius, color, flight, glow }: { index: number; radius: number; color: string; flight: StellarFlight; glow: THREE.Texture }) {
  const { gl } = useThree();
  const page = useMemo(() => gl.domElement.closest<HTMLElement>('.virgo-page'), [gl]);
  const tips = useRef<THREE.Group>(null), mesh = useRef<THREE.Mesh>(null);
  const count = flight.tier === 'low' ? 2 : flight.mobile ? 3 : 5;
  const curves = useMemo(() => Array.from({ length: count }, (_, i) => stellarProminence(i + index * 3, radius)), [count, index, radius]);
  const geometry = useMemo(() => {
    const tubes = curves.map((points, i) => {
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 32, radius * .018, 6, false);
      const { period, duration, offset } = prominenceTiming(i + index * 3);
      const timings = new Float32Array(tube.attributes.position.count * 3);
      for (let j = 0; j < timings.length; j += 3) { timings[j] = period; timings[j + 1] = duration; timings[j + 2] = offset; }
      return tube.setAttribute('eruptionTiming', new THREE.BufferAttribute(timings, 3));
    });
    const merged = mergeGeometries(tubes)!; tubes.forEach(tube => tube.dispose()); return merged;
  }, [curves, radius, index]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ age: { value: 0 }, appearance: { value: 0 }, radius: { value: radius }, enabled: { value: 1 }, tint: { value: new THREE.Color(color) } }), [color, radius]);
  useFrame(() => {
    const presence = systemPresence(index, flight.position);
    uniforms.age.value = flight.reduced ? 0 : flight.time;
    uniforms.appearance.value = presence;
    uniforms.enabled.value = flight.reduced ? 0 : 1;
    if (mesh.current) mesh.current.visible = presence > .001 && !flight.reduced;
    const bursts = curves.map((_, i) => prominenceSample(i + index * 3, uniforms.age.value, flight.reduced));
    tips.current?.children.forEach((child, i) => {
      const sprite = child as THREE.Sprite;
      const { strength, lift } = bursts[i], peak = curves[i][16];
      const distance = Math.hypot(...peak), base = radius * 1.002;
      sprite.position.set(...peak).multiplyScalar((base + (distance - base) * lift) / distance);
      sprite.scale.setScalar(radius * (.14 + strength * .14));
      (sprite.material as THREE.SpriteMaterial).opacity = presence * strength * .3;
      sprite.visible = strength > .001 && presence > .001;
    });
    if (index === 1 && page) page.dataset.plasmaBursts = bursts.map(burst => burst.strength.toFixed(4)).join(',');
  });
  return <group>
    <mesh ref={mesh} geometry={geometry} userData={{ preserveOpacity: true }}>
      <shaderMaterial uniforms={uniforms} vertexShader={PLASMA_VERTEX} fragmentShader={PLASMA_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <group ref={tips}>{curves.map((points, i) => <sprite key={i} position={points[16]} userData={{ preserveOpacity: true }}>
      <spriteMaterial map={glow} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>)}</group>
  </group>;
}
