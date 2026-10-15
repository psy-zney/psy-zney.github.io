import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { systemPresence } from '../data/virgoTransit';
import { STELLAR_NOISE_GLSL, stellarEmission, stellarProminence, prominenceTiming, prominenceSample, supernovaSample } from '../data/virgoStellarEffects';
import { smooth } from '../data/virgoFlight';
import { VIRGO_STARS } from '../data/virgoStations';

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
    const presence = systemPresence(index, flight.position) * stellarEmission(index, flight.position);
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

const NOVA_VERTEX = `varying vec2 novaUv; void main(){novaUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const NOVA_FRAGMENT = `
  uniform float progress; uniform float appearance; uniform float flash; varying vec2 novaUv;
  ${STELLAR_NOISE_GLSL}
  void main(){
    vec2 p=novaUv*2.0-1.0; float r=length(p), a=atan(p.y,p.x);
    float gas=stellarFbm(p*8.0+progress*1.7);
    float front=.62+.035*sin(a*9.0+progress*2.0)+.035*(gas-.5);
    float edge=exp(-pow((r-front)*110.0,2.0));
    float branches=pow(1.0-abs(sin(a*19.0+r*17.0+gas*7.0)),12.0);
    float veins=branches*smoothstep(.24,.48,r)*(1.0-smoothstep(.73,.94,r));
    float cloud=exp(-abs(r-front)*16.0)*(.06+gas*.18);
    float core=exp(-r*r*180.0)*flash*2.8;
    float energy=edge+veins*.65+cloud+core;
    if(energy<.008)discard;
    vec3 color=mix(vec3(.08,.35,.70),vec3(.6,.91,1.0),clamp(edge+veins,0.0,1.0));
    color=mix(color,vec3(1.0,.95,.82),clamp(core,0.0,1.0));
    gl_FragColor=vec4(color*(1.0+energy*.8),min(.94,energy)*appearance);
  }
`;
const EJECTA_VERTEX = `
  uniform float progress; attribute float seed; varying float heat;
  void main(){heat=seed;vec3 p=position*(12.0+progress*(35.0+seed*55.0));
    vec4 view=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*view;
    gl_PointSize=clamp((140.0+seed*140.0)/max(1.0,-view.z),1.0,5.0);}
`;
const EJECTA_FRAGMENT = `
  uniform float appearance; varying float heat;
  void main(){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;
    gl_FragColor=vec4(mix(vec3(1.0,.8,.45),vec3(.55,.87,1.0),heat),pow(1.0-r,1.2)*appearance);}
`;

/** An independent foreground scene. The existing black-hole renderer is untouched. */
export function VirgoSupernova({ flight }: { flight: StellarFlight }) {
  const { camera, gl } = useThree();
  const shell = useRef<THREE.Mesh>(null), group = useRef<THREE.Group>(null);
  const page = useMemo(() => gl.domElement.closest<HTMLElement>('.virgo-page'), [gl]);
  const uniforms = useMemo(() => ({ progress: { value: 0 }, appearance: { value: 0 }, flash: { value: 0 } }), []);
  const ejectaUniforms = useMemo(() => ({ progress: { value: 0 }, appearance: { value: 0 } }), []);
  const geometry = useMemo(() => {
    const count = flight.tier === 'low' ? 80 : flight.mobile ? 150 : 320;
    const positions = [], seeds = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - 2 * (i + .5) / count, phi = i * 2.399963, radius = Math.sqrt(1 - y * y);
      positions.push(Math.cos(phi) * radius, y, Math.sin(phi) * radius); seeds.push((i * .6180339) % 1);
    }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)).setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
  }, [flight.tier, flight.mobile]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const frame = supernovaSample(flight.position, flight.reduced), depth = camera.position.z - VIRGO_STARS[2].position[2];
    uniforms.progress.value = frame.progress;
    uniforms.appearance.value = frame.opacity * smooth(10, 55, depth);
    uniforms.flash.value = frame.flash;
    ejectaUniforms.progress.value = frame.progress; ejectaUniforms.appearance.value = frame.opacity;
    if (group.current) group.current.visible = frame.opacity > .001;
    if (shell.current) { shell.current.quaternion.copy(camera.quaternion); shell.current.scale.setScalar(frame.radius * 2); }
    const diagnostic = [frame.progress, frame.opacity, frame.radius, uniforms.appearance.value].map(v => v.toFixed(4)).join(',');
    if (page && page.dataset.supernovaFrame !== diagnostic) page.dataset.supernovaFrame = diagnostic;
  }, -.3);
  return <group ref={group} position={VIRGO_STARS[2].position} visible={false}>
    <mesh ref={shell}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial uniforms={uniforms} vertexShader={NOVA_VERTEX} fragmentShader={NOVA_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial uniforms={ejectaUniforms} vertexShader={EJECTA_VERTEX} fragmentShader={EJECTA_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  </group>;
}
