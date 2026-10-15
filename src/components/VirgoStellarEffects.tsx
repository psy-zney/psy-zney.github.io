import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { systemPresence } from '../data/virgoTransit';
import { STELLAR_NOISE_GLSL, stellarEmission, stellarProminence, supernovaSample } from '../data/virgoStellarEffects';
import { smooth } from '../data/virgoFlight';
import { VIRGO_STARS } from '../data/virgoStations';

type StellarFlight = { position: number; time: number; reduced: boolean; mobile: boolean; tier: 'low' | 'medium' | 'high' };
const PLASMA_VERTEX = `
  uniform float age; varying vec2 plasmaUv;
  void main(){ plasmaUv=uv; vec3 p=position+normal*sin(uv.x*23.0-age*3.0)*.07;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }
`;
const PLASMA_FRAGMENT = `
  uniform float age; uniform float appearance; uniform vec3 tint; varying vec2 plasmaUv;
  void main(){ float flow=.55+.45*pow(sin(plasmaUv.x*17.0-age*3.0)*.5+.5,3.0);
    vec3 color=mix(tint,vec3(1.0,.97,.88),flow*.75);
    gl_FragColor=vec4(color*1.5,appearance*flow*.9); }
`;

/** Cached coronal loops and hot tips; all motion stays on the star. */
export function StellarPlasma({ index, radius, color, flight, glow }: { index: number; radius: number; color: string; flight: StellarFlight; glow: THREE.Texture }) {
  const tips = useRef<THREE.Group>(null), mesh = useRef<THREE.Mesh>(null);
  const count = flight.tier === 'low' ? 2 : flight.mobile ? 3 : 5;
  const curves = useMemo(() => Array.from({ length: count }, (_, i) => stellarProminence(i + index * 3, radius)), [count, index, radius]);
  const geometry = useMemo(() => {
    const tubes = curves.map(points => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 32, radius * .006, 4, false));
    const merged = mergeGeometries(tubes)!; tubes.forEach(tube => tube.dispose()); return merged;
  }, [curves, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ age: { value: 0 }, appearance: { value: 0 }, tint: { value: new THREE.Color(color) } }), [color]);
  useFrame(() => {
    const presence = systemPresence(index, flight.position) * stellarEmission(index, flight.position);
    uniforms.age.value = flight.reduced ? 0 : flight.time;
    uniforms.appearance.value = presence;
    if (mesh.current) mesh.current.visible = presence > .001;
    tips.current?.children.forEach((child, i) => {
      const sprite = child as THREE.Sprite;
      sprite.scale.setScalar(radius * (.40 + .09 * Math.sin(uniforms.age.value * 1.6 + i)));
      (sprite.material as THREE.SpriteMaterial).opacity = presence * (.6 + .2 * Math.sin(uniforms.age.value * 2 + i));
    });
  });
  return <group>
    <mesh ref={mesh} geometry={geometry} userData={{ preserveOpacity: true }}>
      <shaderMaterial uniforms={uniforms} vertexShader={PLASMA_VERTEX} fragmentShader={PLASMA_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <group ref={tips}>{curves.map((points, i) => <sprite key={i} position={points[16]} userData={{ preserveOpacity: true }}>
      <spriteMaterial map={glow} color="#fff6dc" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
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
